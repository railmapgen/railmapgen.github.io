import { Button, TextInput, TextInputProps } from '@mantine/core';
import { emailValidator } from './account-utils';
import { MdCheck } from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';

const SEND_OPT_INTERVAL_SECOND = 60;

type EmailInputOtpProps = {
    value: string;
    onChange: (value: string) => void;
    onVerify: () => void;
    otpSent: string;
    allowResendOtp?: boolean;
} & Omit<TextInputProps, 'onChange'>;

export default function EmailInputWithOtp({
    value,
    onChange,
    onVerify,
    otpSent,
    allowResendOtp,
    ...others
}: EmailInputOtpProps) {
    const { t } = useTranslation();

    const [isSendOtpDisabled, setIsSendOtpDisabled] = useState(false);
    const [sendOtpDisableSeconds, setSendOtpDisableSeconds] = useState(SEND_OPT_INTERVAL_SECOND);

    const isEmailValid = !!value && emailValidator(value);

    const handleVerifyEmail = () => {
        if (allowResendOtp) {
            setIsSendOtpDisabled(true);
            setSendOtpDisableSeconds(SEND_OPT_INTERVAL_SECOND);
        }
        onVerify();
    };

    useEffect(() => {
        let timer: number;
        if (isSendOtpDisabled && sendOtpDisableSeconds > 0) {
            timer = window.setTimeout(() => {
                setSendOtpDisableSeconds(sendOtpDisableSeconds - 1);
            }, 1000);
        } else if (sendOtpDisableSeconds === 0) {
            setIsSendOtpDisabled(false);
        }

        return () => clearTimeout(timer);
    }, [isSendOtpDisabled, sendOtpDisableSeconds]);

    return (
        <TextInput
            type="email"
            label={t('Email')}
            value={value}
            onChange={({ currentTarget: { value } }) => onChange(value)}
            error={value && !emailValidator(value)}
            rightSection={
                otpSent ? (
                    <Button variant="transparent" size="xs" leftSection={<MdCheck />} disabled>
                        {t('Verification code sent')}
                    </Button>
                ) : (
                    <Button
                        variant="subtle"
                        size="xs"
                        onClick={handleVerifyEmail}
                        disabled={!isEmailValid || isSendOtpDisabled}
                    >
                        {isSendOtpDisabled ? `${sendOtpDisableSeconds}s` : t('Send verification code')}
                    </Button>
                )
            }
            rightSectionWidth="fit-content"
            {...others}
        />
    );
}
