//! UIKit integration for the Apple host: viewport setup and file presentation.
//!
//! Export callers own temporary files until activity completion, including
//! cancellation, after UIKit dismisses the sharing sheet.

use std::{cell::RefCell, path::PathBuf, rc::Rc};

use block2::RcBlock;
use objc2::{
    define_class, msg_send,
    rc::Retained,
    runtime::{AnyClass, AnyObject, Bool},
    DefinedClass, MainThreadMarker, MainThreadOnly, Message,
};
use objc2_foundation::{NSArray, NSError, NSObject, NSObjectProtocol, NSString, NSURL};
use objc2_ui_kit::{
    UIActivityItemSource, UIActivityType, UIActivityTypeSaveToCameraRoll, UIActivityViewController,
    UIImage, UIScrollView, UIScrollViewContentInsetAdjustmentBehavior, UIView, UIViewAutoresizing,
};

/// Keep the WebView edge-to-edge. The web shell derives one content rectangle
/// for canvas and controls; UIKit must not apply a second content inset.
pub fn configure_viewport(window: &tauri::WebviewWindow) -> tauri::Result<()> {
    window.with_webview(|webview| unsafe {
        let view = webview.inner().cast::<AnyObject>();
        // Wry's legacy flexible-margin mask can shrink and offset a WebView
        // when its pre-scene window gets its final device/window dimensions.
        let mask = UIViewAutoresizing::FlexibleWidth | UIViewAutoresizing::FlexibleHeight;
        let _: () = msg_send![view, setAutoresizingMask: mask];
        let parent: Option<Retained<UIView>> = msg_send![view, superview];
        if let Some(parent) = parent {
            parent.setAutoresizingMask(mask);
            let host: Option<Retained<UIView>> = msg_send![&*parent, superview];
            if let Some(host) = host {
                parent.setFrame(host.bounds());
            }
            let _: () = msg_send![view, setFrame: parent.bounds()];
        }
        // Setup can precede UIKit attachment, so registration must not depend
        // on WKWebView.window being non-null during this single callback.
        // The generated observer registers the exact Tao window on attachment.
        if let Some(scene_delegate) = AnyClass::get(c"RMTSceneDelegate") {
            let _: () = msg_send![scene_delegate, registerWebView: view];
        }
        let scroll_view: Retained<UIScrollView> = msg_send![view, scrollView];
        scroll_view
            .setContentInsetAdjustmentBehavior(UIScrollViewContentInsetAdjustmentBehavior::Never);
    })
}

struct ExportItemSourceIvars {
    file_url: Retained<NSURL>,
    image: Option<Retained<UIImage>>,
}

define_class!(
    // NSObject has no additional subclassing requirements. UIKit owns and uses
    // the source on its main thread together with the activity controller.
    #[unsafe(super = NSObject)]
    #[thread_kind = MainThreadOnly]
    #[ivars = ExportItemSourceIvars]
    struct RMTExportItemSource;

    unsafe impl NSObjectProtocol for RMTExportItemSource {}

    unsafe impl UIActivityItemSource for RMTExportItemSource {
        #[unsafe(method_id(activityViewControllerPlaceholderItem:))]
        fn placeholder(&self, _controller: &UIActivityViewController) -> Retained<AnyObject> {
            // An image placeholder advertises Save Image. Other activities
            // receive the file URL below, preserving its name and exact bytes.
            match &self.ivars().image {
                Some(image) => as_object(image.clone()),
                None => as_object(self.ivars().file_url.clone()),
            }
        }

        #[unsafe(method_id(activityViewController:itemForActivityType:))]
        fn item(
            &self,
            _controller: &UIActivityViewController,
            activity_type: Option<&UIActivityType>,
        ) -> Option<Retained<AnyObject>> {
            let save_image = activity_type
                .map(|activity| activity == unsafe { UIActivityTypeSaveToCameraRoll })
                .unwrap_or(false);
            let image = self.ivars().image.as_ref().filter(|_| save_image);
            Some(match image {
                Some(image) => as_object(image.clone()),
                None => as_object(self.ivars().file_url.clone()),
            })
        }
    }
);

impl RMTExportItemSource {
    fn new(
        mtm: MainThreadMarker,
        file_url: Retained<NSURL>,
        image: Option<Retained<UIImage>>,
    ) -> Retained<Self> {
        let this = Self::alloc(mtm).set_ivars(ExportItemSourceIvars { file_url, image });
        // SAFETY: NSObject's init has the declared signature, and the ivars
        // were initialized before exposing this instance to Objective-C.
        unsafe { msg_send![super(this), init] }
    }
}

fn as_object<T: Message>(value: Retained<T>) -> Retained<AnyObject> {
    // SAFETY: Every Objective-C object is an AnyObject; this only erases its
    // static class type and preserves the same ownership.
    unsafe { Retained::cast_unchecked(value) }
}

/// Schedule a share sheet on the window's UIKit thread.
///
/// A returned error means scheduling failed, so the callback will not run.
/// Otherwise the callback runs exactly once with success, cancellation, or a
/// preparation/activity error. The file must remain available until then.
pub fn present_export(
    window: tauri::WebviewWindow,
    path: PathBuf,
    mime_type: String,
    completion: impl FnOnce(Result<bool, String>) + Send + 'static,
) -> tauri::Result<()> {
    window.with_webview(move |webview| {
        let Some(mtm) = MainThreadMarker::new() else {
            completion(Err(
                "The share sheet must run on the UIKit main thread".into()
            ));
            return;
        };
        let Some(filename) = path.to_str() else {
            completion(Err("The export path is not valid UTF-8".into()));
            return;
        };
        if !path.is_file() {
            completion(Err("The exported file is no longer available".into()));
            return;
        }

        // SAFETY: Tauri supplies the live WKWebView handle on its UIKit thread.
        // WKWebView inherits UIView; all retained values stay on this thread.
        let view = unsafe { &*webview.inner().cast::<UIView>() };
        let Some(native_window) = view.window() else {
            completion(Err("The application window is not attached".into()));
            return;
        };
        let Some(mut presenter) = native_window.rootViewController() else {
            completion(Err("The application has no presentation controller".into()));
            return;
        };
        while let Some(presented) = presenter.presentedViewController() {
            presenter = presented;
        }
        if presenter.isBeingDismissed()
            || presenter.isBeingPresented()
            || presenter
                .viewIfLoaded()
                .and_then(|view| view.window())
                .is_none()
        {
            completion(Err(
                "The application is not ready to present a share sheet".into()
            ));
            return;
        }

        let filename = NSString::from_str(filename);
        let file_url = NSURL::fileURLWithPath_isDirectory(&filename, false);
        let image = if mime_type.starts_with("image/") && mime_type != "image/svg+xml" {
            UIImage::imageWithContentsOfFile(&filename)
        } else {
            None
        };
        let source = RMTExportItemSource::new(mtm, file_url, image);
        let items = NSArray::from_retained_slice(&[as_object(source.clone())]);
        // SAFETY: The array contains a valid UIActivityItemSource, with both
        // required methods implemented; no custom activities are supplied.
        let controller = unsafe {
            UIActivityViewController::initWithActivityItems_applicationActivities(
                UIActivityViewController::alloc(mtm),
                &items,
                None,
            )
        };

        // On iPad UIKit presents a popover; anchoring it within the actual
        // WKWebView also remains valid in split view and resized windows.
        if let Some(popover) = controller.popoverPresentationController() {
            popover.setSourceView(Some(view));
            let mut rectangle = view.bounds();
            rectangle.origin.x += rectangle.size.width / 2.0;
            rectangle.origin.y += rectangle.size.height / 2.0;
            rectangle.size.width = 1.0;
            rectangle.size.height = 1.0;
            popover.setSourceRect(rectangle);
        }

        let activity_completion = Rc::new(RefCell::new(Some(completion)));
        let handler = RcBlock::new(
            move |_activity: *mut UIActivityType,
                  completed: Bool,
                  _returned_items: *mut NSArray,
                  error: *mut NSError| {
                // Keep the source (and its decoded image) alive through the
                // activity. Capturing no controller avoids a retain cycle.
                let _source = &source;
                let result = if error.is_null() {
                    Ok(completed.as_bool())
                } else {
                    // SAFETY: UIKit owns a valid NSError during this callback.
                    Err(unsafe { &*error }.localizedDescription().to_string())
                };
                // UIKit has dismissed the sheet before this completion, so the
                // owner may now clean up its file and present the next export.
                let callback = activity_completion.borrow_mut().take();
                if let Some(callback) = callback {
                    callback(result);
                }
            },
        );
        // SAFETY: UIKit copies the block and supplies arguments matching the
        // completionWithItemsHandler ABI; nil object arguments are accepted.
        unsafe { controller.setCompletionWithItemsHandler(RcBlock::as_ptr(&handler)) };
        presenter.presentViewController_animated_completion(&controller, true, None);
    })
}
