import { Button, Modal, Table, TextInput, UnstyledButton } from '@mantine/core';
import { useFocusWithin, useHover, useMediaQuery } from '@mantine/hooks';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { LuRoute, LuSparkles } from 'react-icons/lu';
import { MdArrowOutward, MdCheck, MdGroups, MdKey } from 'react-icons/md';
import { useRootDispatch, useRootSelector } from '../../redux';
import { fetchSubscription, logout } from '../../redux/account/account-slice';
import { addNotification } from '../../redux/notification/notification-slice';
import { apiFetch } from '../../util/api';
import { API_ENDPOINT } from '../../util/constants';
import rmgRuntime from '@railmapgen/rmg-runtime';
import { SUBSCRIPTION_REDEEMED } from '../../util/subscription-redemption';

const guideColors = {
    surface: 'light-dark(#ffffff, #1c212b)',
    text: 'light-dark(#263044, #e3e8ef)',
    muted: 'light-dark(#778091, #97a1b2)',
    border: 'light-dark(#e8ebef, #333b48)',
    soft: 'light-dark(#f7f8fa, #252c37)',
    ultimate: 'light-dark(#8d6728, #dfc083)',
};

const RedeemModal = (props: { opened: boolean; onClose: () => void }) => {
    const { t } = useTranslation();
    const { opened, onClose } = props;
    const { isLoggedIn, token } = useRootSelector(state => state.account);
    const dispatch = useRootDispatch();

    const [CDKey, setCDKey] = React.useState('');
    const [isRedeeming, setIsRedeeming] = React.useState(false);
    const [selectedPlan, setSelectedPlan] = React.useState(1);
    const isMobile = useMediaQuery('(max-width: 900px)', false, { getInitialValueInEffect: false });
    const { hovered: supportHovered, ref: supportRef } = useHover<HTMLAnchorElement>();
    const { hovered: communityHovered, ref: communityRef } = useHover<HTMLAnchorElement>();
    const { focused: codeFocused, ref: codeRef } = useFocusWithin<HTMLInputElement>();

    const plans: {
        name: string;
        description: string;
        tone: 'free' | 'cloud' | 'export' | 'ultimate';
        color: string;
        background: string;
        icon: React.ReactNode;
    }[] = [
        {
            name: t('SubscriptionGuide.free'),
            description: t('SubscriptionGuide.freeDescription'),
            tone: 'free',
            color: 'light-dark(#697487, #b5bdca)',
            background: 'light-dark(#f5f7f9, #282f3a)',
            icon: <LuRoute size="100%" />,
        },
        {
            name: t('RMP_CLOUD_SHORT_NAME'),
            description: t('SubscriptionGuide.cloudDescription'),
            tone: 'cloud',
            color: 'light-dark(#287451, #91cfa9)',
            background: 'linear-gradient(145deg, light-dark(#f0faf5, #243b32), light-dark(#d9f0e2, #2b493a))',
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
            color: 'light-dark(#ac455b, #e9a1b1)',
            background: 'linear-gradient(145deg, light-dark(#fff2f4, #422c35), light-dark(#f9dfe4, #54313c))',
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
            color: guideColors.ultimate,
            background: 'linear-gradient(145deg, light-dark(#fff9ec, #3d3526), light-dark(#f8e8c5, #4d402b))',
            icon: <LuSparkles size="100%" />,
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
                content: {
                    color: guideColors.text,
                    background: guideColors.surface,
                    boxShadow: '0 24px 100px #17212c30',
                    overflow: 'auto',
                },
                header: {
                    padding: isMobile ? 'max(16px, env(safe-area-inset-top)) 16px 16px' : '24px 28px 20px',
                    background: guideColors.surface,
                    alignItems: 'flex-start',
                },
                title: { flex: 1 },
                body: { padding: isMobile ? '0 16px max(24px, env(safe-area-inset-bottom))' : '0 28px 24px' },
                close: {
                    marginTop: 1,
                    color: guideColors.muted,
                    ...(isMobile && { flexShrink: 0, width: 44, height: 44 }),
                },
            }}
            title={
                <div>
                    <div
                        style={{ fontSize: isMobile ? 21 : 25, lineHeight: 1.45, fontWeight: 750, letterSpacing: -0.6 }}
                    >
                        {t('SubscriptionGuide.title')}
                    </div>
                    <div
                        style={{
                            marginTop: 5,
                            color: guideColors.muted,
                            fontSize: 13,
                            lineHeight: 1.6,
                            fontWeight: 400,
                        }}
                    >
                        {t('SubscriptionGuide.subtitle')}
                    </div>
                </div>
            }
        >
            <div
                style={{
                    display: isMobile ? 'grid' : 'none',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: 8,
                    marginBottom: 14,
                }}
                role="group"
                aria-label={t('SubscriptionGuide.choosePlan')}
            >
                {plans.map((plan, index) => (
                    <UnstyledButton
                        key={plan.tone}
                        type="button"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            minHeight: 48,
                            padding: 8,
                            border: '1px solid',
                            borderColor: index === selectedPlan ? 'currentColor' : guideColors.border,
                            borderRadius: 10,
                            background:
                                index === selectedPlan
                                    ? `color-mix(in srgb, currentColor 9%, ${guideColors.surface})`
                                    : guideColors.surface,
                            boxShadow: index === selectedPlan ? 'inset 0 0 0 1px currentColor' : undefined,
                            font: 'inherit',
                            fontSize: 14,
                            fontWeight: 600,
                            color: plan.color,
                        }}
                        data-plan={plan.tone}
                        aria-pressed={index === selectedPlan}
                        onClick={() => setSelectedPlan(index)}
                    >
                        <span
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 28,
                                height: 28,
                                flexShrink: 0,
                            }}
                            aria-hidden
                        >
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
            <div style={{ overflowX: 'auto', border: `1px solid ${guideColors.border}`, borderRadius: 14 }}>
                <Table
                    style={{
                        width: '100%',
                        minWidth: isMobile ? 0 : 760,
                        tableLayout: 'fixed',
                        borderCollapse: 'separate',
                        borderSpacing: 0,
                        fontSize: isMobile ? 13 : 12,
                    }}
                    withRowBorders={false}
                    highlightOnHover
                    highlightOnHoverColor={guideColors.soft}
                    aria-label={t('SubscriptionGuide.features')}
                >
                    <colgroup>
                        <col style={{ width: isMobile ? '57%' : '26%' }} />
                        {plans.map((plan, index) => (
                            <col
                                key={plan.tone}
                                data-selected={index === selectedPlan}
                                style={{
                                    background: plan.tone === 'ultimate' ? 'light-dark(#fdfaf3, #2c2b28)' : undefined,
                                    display: isMobile && index !== selectedPlan ? 'none' : undefined,
                                }}
                            />
                        ))}
                    </colgroup>
                    <thead>
                        <tr>
                            <th
                                scope="col"
                                style={{
                                    padding: isMobile ? 12 : 20,
                                    textAlign: 'left',
                                    fontWeight: 400,
                                    verticalAlign: 'middle',
                                }}
                            >
                                <span style={{ display: 'block', fontSize: 14, fontWeight: 650 }}>
                                    {t('SubscriptionGuide.features')}
                                </span>
                                <span
                                    style={{
                                        display: 'block',
                                        color: guideColors.muted,
                                        fontSize: 12,
                                        marginTop: 7,
                                        lineHeight: 1.6,
                                    }}
                                >
                                    {t('SubscriptionGuide.tableHint')}
                                </span>
                            </th>
                            {plans.map((plan, index) => (
                                <th
                                    scope="col"
                                    key={plan.tone}
                                    data-plan={plan.tone}
                                    data-selected={index === selectedPlan}
                                    style={{
                                        padding: isMobile ? '12px 8px' : '15px 8px 16px',
                                        textAlign: 'center',
                                        fontWeight: 400,
                                        verticalAlign: 'middle',
                                        color: plan.color,
                                        background: plan.background,
                                        display: isMobile && index !== selectedPlan ? 'none' : undefined,
                                    }}
                                >
                                    <span
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            width: 44,
                                            height: 44,
                                            margin: '0 auto 7px',
                                        }}
                                        aria-hidden
                                    >
                                        <span
                                            style={{
                                                width: plan.tone === 'free' || plan.tone === 'ultimate' ? 30 : 44,
                                                height: plan.tone === 'free' || plan.tone === 'ultimate' ? 30 : 44,
                                            }}
                                        >
                                            {plan.icon}
                                        </span>
                                    </span>
                                    <span style={{ display: 'block', fontSize: isMobile ? 16 : 17, fontWeight: 700 }}>
                                        {plan.name}
                                    </span>
                                    <span style={{ display: 'block', fontSize: 11, marginTop: 4, opacity: 0.8 }}>
                                        {plan.description}
                                    </span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <Table.Tbody>
                        {features.map(feature => (
                            <Table.Tr key={feature.label}>
                                <th
                                    scope="row"
                                    style={{
                                        padding: isMobile ? 12 : '9px 20px',
                                        height: 37,
                                        fontWeight: 450,
                                        textAlign: 'left',
                                        borderTop: `1px solid ${guideColors.border}`,
                                        verticalAlign: 'middle',
                                    }}
                                >
                                    {feature.label}
                                    {feature.note && (
                                        <span
                                            style={{
                                                display: 'inline-block',
                                                marginLeft: 7,
                                                padding: '1px 5px',
                                                borderRadius: 4,
                                                background: guideColors.soft,
                                                color: guideColors.muted,
                                                fontSize: 9,
                                            }}
                                        >
                                            {feature.note}
                                        </span>
                                    )}
                                    {feature.description && (
                                        <span
                                            style={{
                                                display: 'block',
                                                marginTop: 5,
                                                color: guideColors.muted,
                                                fontSize: 11,
                                                lineHeight: 1.65,
                                                fontWeight: 400,
                                            }}
                                        >
                                            {feature.description}
                                        </span>
                                    )}
                                </th>
                                {feature.values.map((value, index) => (
                                    <td
                                        key={plans[index].tone}
                                        data-plan={plans[index].tone}
                                        data-selected={index === selectedPlan}
                                        style={{
                                            borderTop: `1px solid ${guideColors.border}`,
                                            padding: '7px 8px',
                                            textAlign: 'center',
                                            verticalAlign: 'middle',
                                            color: plans[index].color,
                                            display: isMobile && index !== selectedPlan ? 'none' : undefined,
                                        }}
                                    >
                                        {value === true ? (
                                            <span
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    width: 20,
                                                    height: 20,
                                                    borderRadius: '50%',
                                                    background: 'color-mix(in srgb, currentColor 9%, transparent)',
                                                    verticalAlign: 'middle',
                                                }}
                                                aria-label={t('SubscriptionGuide.included')}
                                            >
                                                <MdCheck
                                                    size={14}
                                                    style={{ stroke: 'currentColor', strokeWidth: 0.4 }}
                                                    aria-hidden
                                                />
                                            </span>
                                        ) : value === false ? (
                                            <span
                                                style={{ color: '#bfc5cd' }}
                                                aria-label={t('SubscriptionGuide.notIncluded')}
                                            >
                                                —
                                            </span>
                                        ) : (
                                            <span
                                                style={{
                                                    fontSize: isMobile ? 12 : 11,
                                                    fontWeight: 600,
                                                    whiteSpace: isMobile ? 'normal' : 'nowrap',
                                                    overflowWrap: isMobile ? 'anywhere' : undefined,
                                                }}
                                            >
                                                {value}
                                            </span>
                                        )}
                                    </td>
                                ))}
                            </Table.Tr>
                        ))}
                    </Table.Tbody>
                </Table>
            </div>
            <p
                style={{
                    display: 'flex',
                    justifyContent: isMobile ? 'flex-start' : 'flex-end',
                    alignItems: 'center',
                    gap: 6,
                    margin: '10px 2px 0',
                    color: guideColors.muted,
                    fontSize: 11,
                    lineHeight: 1.5,
                }}
            >
                <LuSparkles style={{ color: guideColors.ultimate, flexShrink: 0 }} aria-hidden />
                {t('SubscriptionGuide.bundleNote', {
                    cloud: t('RMP_CLOUD_SHORT_NAME'),
                    export: t('RMP_EXPORT_SHORT_NAME'),
                })}
            </p>

            <h3 style={{ margin: '23px 0 10px', fontSize: 14, fontWeight: 650 }}>{t('SubscriptionGuide.methods')}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                <UnstyledButton
                    component="a"
                    ref={supportRef}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '17px 16px',
                        border: '1px solid',
                        borderColor: supportHovered ? '#aebbcf' : guideColors.border,
                        borderRadius: 12,
                        textDecoration: 'none',
                        color: guideColors.text,
                        background: supportHovered ? guideColors.soft : guideColors.surface,
                        transition: 'border-color 150ms, background 150ms',
                    }}
                    href="https://ifdian.net/item/9c8b220c614311efab2d52540025c377"
                    target="_blank"
                    rel="noreferrer"
                >
                    <span
                        style={{
                            display: 'flex',
                            flexShrink: 0,
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 36,
                            height: 36,
                            borderRadius: 11,
                            background: 'light-dark(#f2ecfc, #352d48)',
                            color: 'light-dark(#8660bc, #b59add)',
                        }}
                    >
                        <img
                            src={`${import.meta.env.BASE_URL}images/afdian.png`}
                            width={28}
                            height={28}
                            style={{ objectFit: 'contain' }}
                            alt=""
                        />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                flexWrap: 'wrap',
                                fontSize: 14,
                                fontWeight: 650,
                            }}
                        >
                            爱发电{' '}
                            <span style={{ color: guideColors.muted, fontSize: 10, fontWeight: 400 }}>
                                {t('SubscriptionGuide.support')}
                            </span>
                        </div>
                        <p style={{ margin: '5px 0 0', color: guideColors.muted, fontSize: 11, lineHeight: 1.6 }}>
                            {t('SubscriptionGuide.supportDescription')}
                        </p>
                    </div>
                    <MdArrowOutward
                        style={{ flexShrink: 0, width: 17, height: 17, color: guideColors.muted }}
                        aria-hidden
                    />
                </UnstyledButton>
                <UnstyledButton
                    component="a"
                    ref={communityRef}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '17px 16px',
                        border: '1px solid',
                        borderColor: communityHovered ? '#aebbcf' : guideColors.border,
                        borderRadius: 12,
                        textDecoration: 'none',
                        color: guideColors.text,
                        background: communityHovered ? guideColors.soft : guideColors.surface,
                        transition: 'border-color 150ms, background 150ms',
                    }}
                    href="https://github.com/railmapgen/railmapgen.github.io/wiki/Earn-Subscriptions-Through-Community-Reviews"
                    target="_blank"
                    rel="noreferrer"
                >
                    <span
                        style={{
                            display: 'flex',
                            flexShrink: 0,
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 36,
                            height: 36,
                            borderRadius: 11,
                            background: 'light-dark(#eaf3fc, #26394d)',
                            color: 'light-dark(#4a7eaf, #98bde2)',
                        }}
                    >
                        <MdGroups size={21} aria-hidden />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                flexWrap: 'wrap',
                                fontSize: 14,
                                fontWeight: 650,
                            }}
                        >
                            {t('Community Reviews')}{' '}
                            <span style={{ color: guideColors.muted, fontSize: 10, fontWeight: 400 }}>
                                {t('SubscriptionGuide.contribute')}
                            </span>
                        </div>
                        <p style={{ margin: '5px 0 0', color: guideColors.muted, fontSize: 11, lineHeight: 1.6 }}>
                            {t('SubscriptionGuide.communityDescription')}
                        </p>
                    </div>
                    <MdArrowOutward
                        style={{ flexShrink: 0, width: 17, height: 17, color: guideColors.muted }}
                        aria-hidden
                    />
                </UnstyledButton>
            </div>

            <form
                style={{
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    alignItems: isMobile ? 'stretch' : 'center',
                    justifyContent: 'space-between',
                    gap: isMobile ? 14 : 20,
                    marginTop: 20,
                    padding: 18,
                    border: `1px solid ${guideColors.border}`,
                    borderRadius: 12,
                    background: guideColors.soft,
                }}
                onSubmit={event => {
                    event.preventDefault();
                    void handleRedeem(CDKey);
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                    <span
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            color: '#68778b',
                            background: guideColors.surface,
                        }}
                    >
                        <MdKey size={20} style={{ transform: 'rotate(-30deg)' }} aria-hidden />
                    </span>
                    <div>
                        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 650 }}>{t('SubscriptionGuide.haveCode')}</h3>
                        <p style={{ margin: '5px 0 0', fontSize: 11, color: guideColors.muted }}>
                            {t('SubscriptionGuide.codeDescription')}
                        </p>
                    </div>
                </div>
                <div
                    style={{
                        display: 'flex',
                        flexDirection: isMobile ? 'column' : 'row',
                        alignItems: isMobile ? 'stretch' : 'center',
                        gap: 8,
                        width: isMobile ? '100%' : '44%',
                    }}
                >
                    <TextInput
                        ref={codeRef}
                        data-autofocus={isMobile ? undefined : true}
                        label={t('CDKey')}
                        placeholder={t('Enter your CDKey here')}
                        value={CDKey}
                        onChange={({ currentTarget: { value } }) => setCDKey(value)}
                        styles={{
                            root: { flex: 1, minWidth: 0 },
                            label: {
                                position: 'absolute',
                                width: 1,
                                height: 1,
                                padding: 0,
                                margin: -1,
                                overflow: 'hidden',
                                clipPath: 'inset(50%)',
                                whiteSpace: 'nowrap',
                            },
                            input: {
                                fontSize: isMobile ? 16 : 12,
                                background: guideColors.surface,
                                borderColor: codeFocused ? '#7597bb' : guideColors.border,
                                color: guideColors.text,
                                boxShadow: codeFocused ? '0 0 0 3px #6991ba14' : undefined,
                            },
                        }}
                        size="md"
                        radius="md"
                    />
                    <Button
                        type="submit"
                        size="md"
                        radius="md"
                        loading={isRedeeming}
                        style={{ fontSize: 13, paddingInline: 24, minHeight: isMobile ? 44 : undefined }}
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
