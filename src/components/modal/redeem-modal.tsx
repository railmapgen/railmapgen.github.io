import { Button, Modal, Table, TextInput, UnstyledButton } from '@mantine/core';
import { useFocusWithin, useHover, useMediaQuery } from '@mantine/hooks';
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
import { getRedeemModalStyles, guideColors, planStyles } from './redeem-modal.styles';

const RedeemModal = (props: { opened: boolean; onClose: () => void }) => {
    const { t } = useTranslation();
    const { opened, onClose } = props;
    const { isLoggedIn, token } = useRootSelector(state => state.account);
    const dispatch = useRootDispatch();

    const [CDKey, setCDKey] = React.useState('');
    const [isRedeeming, setIsRedeeming] = React.useState(false);
    const [selectedPlan, setSelectedPlan] = React.useState(1);
    const isMobile = useMediaQuery('(max-width: 900px)', false, { getInitialValueInEffect: false });
    const styles = getRedeemModalStyles(isMobile);
    const { hovered: supportHovered, ref: supportRef } = useHover<HTMLAnchorElement>();
    const { hovered: communityHovered, ref: communityRef } = useHover<HTMLAnchorElement>();
    const { focused: codeFocused, ref: codeRef } = useFocusWithin<HTMLInputElement>();

    const plans: {
        name: string;
        description: string;
        tone: keyof typeof planStyles;
        icon: React.ReactNode;
    }[] = [
        {
            name: t('SubscriptionGuide.free'),
            description: t('SubscriptionGuide.freeDescription'),
            tone: 'free',
            icon: <MdOutlineDraw size="100%" />,
        },
        {
            name: t('RMP_CLOUD_SHORT_NAME'),
            description: t('SubscriptionGuide.cloudDescription'),
            tone: 'cloud',
            icon: (
                <img
                    src={`${import.meta.env.BASE_URL}images/subscriptions/shuppatsu_shinko.svg`}
                    width="100%"
                    height="100%"
                    alt=""
                    style={{ colorScheme: 'inherit' }}
                />
            ),
        },
        {
            name: t('RMP_EXPORT_SHORT_NAME'),
            description: t('SubscriptionGuide.exportDescription'),
            tone: 'export',
            icon: (
                <img
                    src={`${import.meta.env.BASE_URL}images/subscriptions/ichido_teishi.svg`}
                    width="100%"
                    height="100%"
                    alt=""
                    style={{ colorScheme: 'inherit' }}
                />
            ),
        },
        {
            name: t('SubscriptionGuide.ultimate'),
            description: t('SubscriptionGuide.ultimateDescription'),
            tone: 'ultimate',
            icon: <MdAutoAwesome size="100%" />,
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
            styles={{
                content: styles.content,
                header: styles.header,
                title: styles.title,
                body: styles.body,
                close: styles.close,
            }}
            title={
                <div>
                    <div style={styles.heading}>{t('SubscriptionGuide.title')}</div>
                    <div style={styles.subtitle}>{t('SubscriptionGuide.subtitle')}</div>
                </div>
            }
        >
            <div style={styles.planPicker} role="group" aria-label={t('SubscriptionGuide.choosePlan')}>
                {plans.map((plan, index) => (
                    <UnstyledButton
                        key={plan.tone}
                        type="button"
                        style={{
                            ...styles.planOption,
                            color: planStyles[plan.tone].color,
                            ...(index === selectedPlan && styles.selectedPlanOption),
                        }}
                        data-plan={plan.tone}
                        aria-pressed={index === selectedPlan}
                        onClick={() => setSelectedPlan(index)}
                    >
                        <span style={styles.planOptionIcon} aria-hidden>
                            <span
                                style={{
                                    width: plan.tone === 'free' || plan.tone === 'ultimate' ? 21 : 28,
                                    height: plan.tone === 'free' || plan.tone === 'ultimate' ? 21 : 28,
                                }}
                            >
                                {plan.icon}
                            </span>
                        </span>
                        {plan.name}
                    </UnstyledButton>
                ))}
            </div>
            <div style={styles.tableScroll}>
                <Table
                    style={styles.comparison}
                    withRowBorders={false}
                    highlightOnHover
                    highlightOnHoverColor={guideColors.soft}
                    aria-label={t('SubscriptionGuide.features')}
                >
                    <colgroup>
                        <col style={styles.featureColumn} />
                        {plans.map((plan, index) => (
                            <col
                                key={plan.tone}
                                data-selected={index === selectedPlan}
                                style={{
                                    ...(plan.tone === 'ultimate' && styles.ultimateColumn),
                                    display: isMobile && index !== selectedPlan ? 'none' : undefined,
                                }}
                            />
                        ))}
                    </colgroup>
                    <thead>
                        <tr>
                            <th scope="col" style={styles.featureHeading}>
                                <span style={styles.sectionLabel}>{t('SubscriptionGuide.features')}</span>
                                <span style={styles.tableHint}>{t('SubscriptionGuide.tableHint')}</span>
                            </th>
                            {plans.map((plan, index) => (
                                <th
                                    scope="col"
                                    key={plan.tone}
                                    data-plan={plan.tone}
                                    data-selected={index === selectedPlan}
                                    style={{
                                        ...styles.planHeading,
                                        ...planStyles[plan.tone],
                                        display: isMobile && index !== selectedPlan ? 'none' : undefined,
                                    }}
                                >
                                    <span style={styles.planIcon} aria-hidden>
                                        <span
                                            style={{
                                                width: plan.tone === 'free' || plan.tone === 'ultimate' ? 30 : 44,
                                                height: plan.tone === 'free' || plan.tone === 'ultimate' ? 30 : 44,
                                            }}
                                        >
                                            {plan.icon}
                                        </span>
                                    </span>
                                    <span style={styles.planName}>{plan.name}</span>
                                    <span style={styles.planDescription}>{plan.description}</span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <Table.Tbody>
                        {features.map(feature => (
                            <Table.Tr key={feature.label}>
                                <th scope="row" style={styles.featureLabel}>
                                    {feature.label}
                                    {feature.note && <span style={styles.featureNote}>{feature.note}</span>}
                                    {feature.description && (
                                        <span style={styles.featureDescription}>{feature.description}</span>
                                    )}
                                </th>
                                {feature.values.map((value, index) => (
                                    <td
                                        key={plans[index].tone}
                                        data-plan={plans[index].tone}
                                        data-selected={index === selectedPlan}
                                        style={{
                                            ...styles.featureCell,
                                            color: planStyles[plans[index].tone].color,
                                            display: isMobile && index !== selectedPlan ? 'none' : undefined,
                                        }}
                                    >
                                        {value === true ? (
                                            <span style={styles.check} aria-label={t('SubscriptionGuide.included')}>
                                                <MdCheck
                                                    size={14}
                                                    style={{ stroke: 'currentColor', strokeWidth: 0.4 }}
                                                    aria-hidden
                                                />
                                            </span>
                                        ) : value === false ? (
                                            <span style={styles.dash} aria-label={t('SubscriptionGuide.notIncluded')}>
                                                —
                                            </span>
                                        ) : (
                                            <span style={styles.cellValue}>{value}</span>
                                        )}
                                    </td>
                                ))}
                            </Table.Tr>
                        ))}
                    </Table.Tbody>
                </Table>
            </div>
            <p style={styles.bundleNote}>
                <MdAutoAwesome style={{ color: guideColors.ultimate, flexShrink: 0 }} aria-hidden />
                {t('SubscriptionGuide.bundleNote', {
                    cloud: t('RMP_CLOUD_SHORT_NAME'),
                    export: t('RMP_EXPORT_SHORT_NAME'),
                })}
            </p>

            <h3 style={styles.methodsHeading}>{t('SubscriptionGuide.methods')}</h3>
            <div style={styles.methods}>
                <UnstyledButton
                    component="a"
                    ref={supportRef}
                    style={{ ...styles.methodCard, ...(supportHovered && styles.methodCardHovered) }}
                    href="https://ifdian.net/item/9c8b220c614311efab2d52540025c377"
                    target="_blank"
                    rel="noreferrer"
                >
                    <span style={{ ...styles.methodIcon, ...styles.supportIcon }}>
                        <img
                            src={`${import.meta.env.BASE_URL}images/afdian.png`}
                            width={28}
                            height={28}
                            style={{ objectFit: 'contain' }}
                            alt=""
                        />
                    </span>
                    <div style={styles.methodCopy}>
                        <div style={styles.methodTitle}>
                            爱发电 <span style={styles.methodTag}>{t('SubscriptionGuide.support')}</span>
                        </div>
                        <p style={styles.methodDescription}>{t('SubscriptionGuide.supportDescription')}</p>
                    </div>
                    <MdArrowOutward style={styles.methodArrow} aria-hidden />
                </UnstyledButton>
                <UnstyledButton
                    component="a"
                    ref={communityRef}
                    style={{ ...styles.methodCard, ...(communityHovered && styles.methodCardHovered) }}
                    href="https://github.com/railmapgen/railmapgen.github.io/wiki/Earn-Subscriptions-Through-Community-Reviews"
                    target="_blank"
                    rel="noreferrer"
                >
                    <span style={{ ...styles.methodIcon, ...styles.communityIcon }}>
                        <MdGroups size={21} aria-hidden />
                    </span>
                    <div style={styles.methodCopy}>
                        <div style={styles.methodTitle}>
                            {t('Community Reviews')}{' '}
                            <span style={styles.methodTag}>{t('SubscriptionGuide.contribute')}</span>
                        </div>
                        <p style={styles.methodDescription}>{t('SubscriptionGuide.communityDescription')}</p>
                    </div>
                    <MdArrowOutward style={styles.methodArrow} aria-hidden />
                </UnstyledButton>
            </div>

            <form
                style={styles.redeemForm}
                onSubmit={event => {
                    event.preventDefault();
                    void handleRedeem(CDKey);
                }}
            >
                <div style={styles.redeemIntro}>
                    <span style={styles.keyIcon}>
                        <MdKey size={20} style={{ transform: 'rotate(-30deg)' }} aria-hidden />
                    </span>
                    <div>
                        <h3 style={styles.redeemHeading}>{t('SubscriptionGuide.haveCode')}</h3>
                        <p style={styles.redeemDescription}>{t('SubscriptionGuide.codeDescription')}</p>
                    </div>
                </div>
                <div style={styles.redeemControls}>
                    <TextInput
                        ref={codeRef}
                        data-autofocus={isMobile ? undefined : true}
                        label={t('CDKey')}
                        placeholder={t('Enter your CDKey here')}
                        value={CDKey}
                        onChange={({ currentTarget: { value } }) => setCDKey(value)}
                        styles={{
                            root: styles.codeField,
                            label: styles.codeLabel,
                            input: { ...styles.codeInput, ...(codeFocused && styles.codeInputFocused) },
                        }}
                        size="md"
                        radius="md"
                    />
                    <Button
                        type="submit"
                        size="md"
                        radius="md"
                        loading={isRedeeming}
                        style={styles.redeemButton}
                        vars={() => ({
                            root: {
                                '--button-bg': 'light-dark(#344c68, #86a9d1)',
                                '--button-hover': 'light-dark(#263c56, #86a9d1)',
                                '--button-color': 'light-dark(#ffffff, #15263b)',
                                '--button-hover-color': 'light-dark(#ffffff, #15263b)',
                            },
                        })}
                    >
                        {t('Redeem')}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default RedeemModal;
