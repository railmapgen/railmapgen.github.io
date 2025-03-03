import { useState } from 'react';
import { Box, PasswordInput, Popover, Progress, Text } from '@mantine/core';
import { MdCheck, MdClose } from 'react-icons/md';
import { useTranslation } from 'react-i18next';

function PasswordRequirement({ meets, label }: { meets: boolean; label: string }) {
    return (
        <Text c={meets ? 'teal' : 'red'} style={{ display: 'flex', alignItems: 'center' }} mt={7} size="sm">
            {meets ? <MdCheck size={14} /> : <MdClose size={14} />}
            <Box ml={10}>{label}</Box>
        </Text>
    );
}

const requirements = [
    { re: /[0-9]/, label: 'Includes number' },
    { re: /[a-zA-Z]/, label: 'Includes letter' },
];

function getStrength(password: string) {
    let multiplier = password.length >= 8 ? 0 : 1;

    requirements.forEach(requirement => {
        if (!requirement.re.test(password)) {
            multiplier += 1;
        }
    });

    return Math.max(100 - (100 / (requirements.length + 1)) * multiplier, 10);
}

type PasswordSetupProps = {
    value: string;
    onChange: (value: string) => void;
};

export default function PasswordSetup({ value, onChange }: PasswordSetupProps) {
    const { t } = useTranslation();

    const [popoverOpened, setPopoverOpened] = useState(false);
    const checks = requirements.map((requirement, index) => (
        <PasswordRequirement key={index} label={requirement.label} meets={requirement.re.test(value)} />
    ));

    const strength = getStrength(value);
    const color = strength === 100 ? 'teal' : strength > 50 ? 'yellow' : 'red';

    return (
        <Popover opened={popoverOpened} position="bottom" width="target" transitionProps={{ transition: 'pop' }}>
            <Popover.Target>
                <div onFocusCapture={() => setPopoverOpened(true)} onBlurCapture={() => setPopoverOpened(false)}>
                    <PasswordInput
                        label={t('Password')}
                        value={value}
                        onChange={event => onChange(event.currentTarget.value)}
                    />
                </div>
            </Popover.Target>
            <Popover.Dropdown>
                <Progress color={color} value={strength} size={5} mb="xs" />
                <PasswordRequirement label={t('Includes at least 8 characters')} meets={value.length >= 8} />
                {checks}
            </Popover.Dropdown>
        </Popover>
    );
}
