#import <UIKit/UIKit.h>

@interface RMTRecoveryTestHost : UIResponder <UIApplicationDelegate>
@end

@interface RMTRecoveryTestScene : UIResponder <UIWindowSceneDelegate>
@property(nonatomic, strong) UIWindow *window;
@end

@implementation RMTRecoveryTestHost
@end

@implementation RMTRecoveryTestScene
- (void)scene:(UIScene *)scene willConnectToSession:(UISceneSession *)session options:(UISceneConnectionOptions *)options {
    self.window = [[UIWindow alloc] initWithWindowScene:(UIWindowScene *)scene];
    self.window.rootViewController = [UIViewController new];
    [self.window makeKeyAndVisible];
}
@end

int main(int argc, char *argv[]) {
    @autoreleasepool {
        return UIApplicationMain(argc, argv, nil, NSStringFromClass(RMTRecoveryTestHost.class));
    }
}
