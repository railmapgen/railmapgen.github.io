import { Button, Modal, TextInput } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdArrowOutward, MdAutoAwesome, MdCheck, MdGroups, MdKey, MdOutlineDraw } from 'react-icons/md';
import { useRootDispatch, useRootSelector } from '../../redux';
import { fetchSubscription, logout } from '../../redux/account/account-slice';
import { addNotification } from '../../redux/notification/notification-slice';
import { apiFetch } from '../../util/api';
import { API_ENDPOINT } from '../../util/constants';
import rmgRuntime from '@railmapgen/rmg-runtime';
import { SUBSCRIPTION_REDEEMED } from '../../util/subscription-redemption';
import classes from './redeem-modal.module.css';

const RedeemModal = (props: { opened: boolean; onClose: () => void }) => {
    const { t } = useTranslation();
    const { opened, onClose } = props;
    const { isLoggedIn, token } = useRootSelector(state => state.account);
    const dispatch = useRootDispatch();

    const [CDKey, setCDKey] = React.useState('');
    const [isRedeeming, setIsRedeeming] = React.useState(false);
    const [selectedPlan, setSelectedPlan] = React.useState(1);
    const isMobile = useMediaQuery('(max-width: 900px)', false, { getInitialValueInEffect: false });

    const plans = [
        {
            name: t('SubscriptionGuide.free'),
            description: t('SubscriptionGuide.freeDescription'),
            tone: 'free',
            icon: <MdOutlineDraw />,
        },
        {
            name: t('RMP_CLOUD_SHORT_NAME'),
            description: t('SubscriptionGuide.cloudDescription'),
            tone: 'cloud',
            icon: <img src={`${import.meta.env.BASE_URL}images/subscriptions/shuppatsu_shinko.svg`} alt="" />,
        },
        {
            name: t('RMP_EXPORT_SHORT_NAME'),
            description: t('SubscriptionGuide.exportDescription'),
            tone: 'export',
            icon: <img src={`${import.meta.env.BASE_URL}images/subscriptions/ichido_teishi.svg`} alt="" />,
        },
        {
            name: t('SubscriptionGuide.ultimate'),
            description: t('SubscriptionGuide.ultimateDescription'),
            tone: 'ultimate',
            icon: <MdAutoAwesome />,
        },
    ];
    const features = [
        { label: t('SubscriptionGuide.basic'), values: [true, true, true, true] },
        {
            label: t('SubscriptionGuide.saves'),
            values: [
                t('SubscriptionGuide.items', { count: 1 }),
                t('SubscriptionGuide.items', { count: 100 }),
                t('SubscriptionGuide.items', { count: 1 }),
                t('SubscriptionGuide.items', { count: 100 }),
            ],
        },
        {
            label: t('SubscriptionGuide.paths'),
            values: [
                t('SubscriptionGuide.contextPaths'),
                t('SubscriptionGuide.allPaths'),
                t('SubscriptionGuide.contextPaths'),
                t('SubscriptionGuide.allPaths'),
            ],
        },
        {
            label: t('SubscriptionGuide.styleLayers'),
            values: [
                t('SubscriptionGuide.layers', { count: 2 }),
                t('SubscriptionGuide.unlimited'),
                t('SubscriptionGuide.layers', { count: 2 }),
                t('SubscriptionGuide.unlimited'),
            ],
        },
        {
            label: t('SubscriptionGuide.parallelLines'),
            values: [
                t('SubscriptionGuide.lines', { count: 5 }),
                t('SubscriptionGuide.unlimited'),
                t('SubscriptionGuide.lines', { count: 5 }),
                t('SubscriptionGuide.unlimited'),
            ],
        },
        {
            label: t('SubscriptionGuide.master'),
            values: [
                t('SubscriptionGuide.items', { count: 3 }),
                t('SubscriptionGuide.unlimited'),
                t('SubscriptionGuide.items', { count: 3 }),
                t('SubscriptionGuide.unlimited'),
            ],
        },
        {
            label: t('SubscriptionGuide.randomNames'),
            description: t('SubscriptionGuide.randomNamesDescription'),
            values: [false, true, false, true],
        },
        { label: t('SubscriptionGuide.semanticTranslation'), values: [false, true, false, true] },
        { label: t('SubscriptionGuide.batchEditing'), values: [false, true, false, true] },
        {
            label: t('SubscriptionGuide.mapAppearance'),
            description: t('SubscriptionGuide.mapAppearanceDescription'),
            values: [false, true, false, true],
        },
        {
            label: t('SubscriptionGuide.cloudImages'),
            values: [
                false,
                false,
                t('SubscriptionGuide.images', { count: 50 }),
                t('SubscriptionGuide.images', { count: 50 }),
            ],
        },
        {
            label: t('SubscriptionGuide.largeExports'),
            note: t('SubscriptionGuide.desktopOnly'),
            values: [false, false, true, true],
        },
        {
            label: t('SubscriptionGuide.videoQuality'),
            values: ['1080p · 30 FPS', '1080p · 30 FPS', '4K · 60 FPS', '4K · 60 FPS'],
        },
        { label: t('SubscriptionGuide.videoClean'), values: [false, false, true, true] },
        { label: t('SubscriptionGuide.overlay'), values: [false, false, true, true] },
    ];

    const showErrorToast = (msg: string) =>
        dispatch(
            addNotification({
                title: t('Unable to redeem'),
                message: msg,
                type: 'error',
                duration: 9000,
            })
        );

    const handleRedeem = async (CDKey: string) => {
        if (!isLoggedIn || isRedeeming) return;
        setIsRedeeming(true);
        try {
            const rep = await apiFetch(
                API_ENDPOINT.SUBSCRIPTION_REDEEM,
                { method: 'POST', body: JSON.stringify({ cdkey: CDKey.trim() }) },
                token
            );
            if (rep.status === 401) {
                showErrorToast(t('Login status expired.'));
                dispatch(logout());
                return;
            }
            if (rep.status !== 202) {
                const msg = (await rep.json()).message;
                showErrorToast(t(msg));
                return;
            }
            dispatch(fetchSubscription());
            rmgRuntime.postEvent(SUBSCRIPTION_REDEEMED, undefined);
            onClose();
        } catch (error) {
            showErrorToast(error instanceof Error ? error.message : t('Unable to redeem'));
        } finally {
            setIsRedeeming(false);
        }
    };

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            size={1080}
            fullScreen={isMobile}
            radius="xl"
            centered
            overlayProps={{ backgroundOpacity: 0.38, blur: 5 }}
            classNames={{
                content: classes.content,
                header: classes.header,
                title: classes.title,
                body: classes.body,
                close: classes.close,
            }}
            title={
                <div>
                    <div className={classes.heading}>{t('SubscriptionGuide.title')}</div>
                    <div className={classes.subtitle}>{t('SubscriptionGuide.subtitle')}</div>
                </div>
            }
        >
            <div className={classes.planPicker} role="group" aria-label={t('SubscriptionGuide.choosePlan')}>
                {plans.map((plan, index) => (
                    <button
                        key={plan.tone}
                        type="button"
                        className={classes.planOption}
                        data-plan={plan.tone}
                        aria-pressed={index === selectedPlan}
                        onClick={() => setSelectedPlan(index)}
                    >
                        <span aria-hidden>{plan.icon}</span>
                        {plan.name}
                    </button>
                ))}
            </div>
            <div className={classes.tableScroll}>
                <table className={classes.comparison} aria-label={t('SubscriptionGuide.features')}>
                    <colgroup>
                        <col className={classes.featureColumn} />
                        {plans.map((plan, index) => (
                            <col key={plan.tone} data-selected={index === selectedPlan} />
                        ))}
                    </colgroup>
                    <thead>
                        <tr>
                            <th scope="col" className={classes.featureHeading}>
                                <span className={classes.sectionLabel}>{t('SubscriptionGuide.features')}</span>
                                <span className={classes.tableHint}>{t('SubscriptionGuide.tableHint')}</span>
                            </th>
                            {plans.map((plan, index) => (
                                <th
                                    scope="col"
                                    key={plan.tone}
                                    data-plan={plan.tone}
                                    data-selected={index === selectedPlan}
                                >
                                    <span className={classes.planIcon} aria-hidden>
                                        {plan.icon}
                                    </span>
                                    <span className={classes.planName}>{plan.name}</span>
                                    <span className={classes.planDescription}>{plan.description}</span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {features.map(feature => (
                            <tr key={feature.label}>
                                <th scope="row">
                                    {feature.label}
                                    {feature.note && <span className={classes.featureNote}>{feature.note}</span>}
                                    {feature.description && (
                                        <span className={classes.featureDescription}>{feature.description}</span>
                                    )}
                                </th>
                                {feature.values.map((value, index) => (
                                    <td
                                        key={plans[index].tone}
                                        data-plan={plans[index].tone}
                                        data-selected={index === selectedPlan}
                                    >
                                        {value === true ? (
                                            <span
                                                className={classes.check}
                                                aria-label={t('SubscriptionGuide.included')}
                                            >
                                                <MdCheck aria-hidden />
                                            </span>
                                        ) : value === false ? (
                                            <span
                                                className={classes.dash}
                                                aria-label={t('SubscriptionGuide.notIncluded')}
                                            >
                                                —
                                            </span>
                                        ) : (
                                            <span className={classes.cellValue}>{value}</span>
                                        )}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p className={classes.bundleNote}>
                <MdAutoAwesome aria-hidden />
                {t('SubscriptionGuide.bundleNote', {
                    cloud: t('RMP_CLOUD_SHORT_NAME'),
                    export: t('RMP_EXPORT_SHORT_NAME'),
                })}
            </p>

            <div className={classes.methodsHeading}>
                <h3>{t('SubscriptionGuide.methods')}</h3>
                <span>{t('SubscriptionGuide.methodHint')}</span>
            </div>
            <div className={classes.methods}>
                <a
                    className={classes.methodCard}
                    href="https://ifdian.net/item/9c8b220c614311efab2d52540025c377"
                    target="_blank"
                    rel="noreferrer"
                >
                    <span className={classes.methodIcon} data-method="support">
                        <img src={`${import.meta.env.BASE_URL}images/afdian.png`} alt="" />
                    </span>
                    <div className={classes.methodCopy}>
                        <div className={classes.methodTitle}>
                            爱发电 <span>{t('SubscriptionGuide.support')}</span>
                        </div>
                        <p>{t('SubscriptionGuide.supportDescription')}</p>
                    </div>
                    <MdArrowOutward className={classes.methodArrow} aria-hidden />
                </a>
                <a
                    className={classes.methodCard}
                    href="https://github.com/railmapgen/railmapgen.github.io/wiki/Earn-Subscriptions-Through-Community-Reviews"
                    target="_blank"
                    rel="noreferrer"
                >
                    <span className={classes.methodIcon} data-method="community">
                        <MdGroups aria-hidden />
                    </span>
                    <div className={classes.methodCopy}>
                        <div className={classes.methodTitle}>
                            {t('Community Reviews')} <span>{t('SubscriptionGuide.contribute')}</span>
                        </div>
                        <p>{t('SubscriptionGuide.communityDescription')}</p>
                    </div>
                    <MdArrowOutward className={classes.methodArrow} aria-hidden />
                </a>
            </div>

            <form
                className={classes.redeemForm}
                onSubmit={event => {
                    event.preventDefault();
                    void handleRedeem(CDKey);
                }}
            >
                <div className={classes.redeemIntro}>
                    <span className={classes.keyIcon}>
                        <MdKey aria-hidden />
                    </span>
                    <div>
                        <h3>{t('SubscriptionGuide.haveCode')}</h3>
                        <p>{t('SubscriptionGuide.codeDescription')}</p>
                    </div>
                </div>
                <div className={classes.redeemControls}>
                    <TextInput
                        data-autofocus={isMobile ? undefined : true}
                        label={t('CDKey')}
                        placeholder={t('Enter your CDKey here')}
                        value={CDKey}
                        onChange={({ currentTarget: { value } }) => setCDKey(value)}
                        classNames={{ root: classes.codeField, label: classes.codeLabel, input: classes.codeInput }}
                        size="md"
                        radius="md"
                    />
                    <Button type="submit" size="md" radius="md" loading={isRedeeming} className={classes.redeemButton}>
                        {t('Redeem')}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default RedeemModal;
