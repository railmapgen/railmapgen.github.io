import React, { useState, useRef, useEffect } from 'react';
import { TextInput, Text, ActionIcon, Group, useMantineTheme } from '@mantine/core';
import { MdOutlineDriveFileRenameOutline } from 'react-icons/md';

interface InlineEditProps {
    initialValue: string;
    onSave: (newValue: string) => void;
    fontWeight?: React.CSSProperties['fontWeight'];
    iconVariant?: string;
    textInputWidth?: string;
    placeholder?: string;
    emptyPlaceholder?: string;
}

function InlineEdit(props: InlineEditProps) {
    const {
        initialValue,
        onSave,
        fontWeight = 'bold',
        iconVariant,
        textInputWidth,
        placeholder = '...',
        emptyPlaceholder = '(empty)',
    } = props;
    const theme = useMantineTheme();
    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState(initialValue);
    const inputRef = useRef<HTMLInputElement>(null);
    const [initialValueOnEdit, setInitialValueOnEdit] = useState(''); // Store the initial value when editing starts, used for cancellation

    // Effect: When entering edit mode, automatically focus the input field and select all text
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select(); // Select the current text for easy replacement
        }
    }, [isEditing]);

    const handleEditClick = () => {
        setInitialValueOnEdit(value); // Record the current value for potential cancellation
        setIsEditing(true);
        // Focus operation is handled by useEffect
    };

    const handleSave = () => {
        if (value !== initialValueOnEdit) {
            // Only call onSave if the value has changed
            onSave(value);
        }
        setIsEditing(false);
    };

    const handleCancel = () => {
        setValue(initialValueOnEdit); // Restore the value to what it was before editing
        setIsEditing(false);
    };

    // Input field content change
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setValue(event.currentTarget.value);
    };

    // Listen for keyboard events (Enter, Escape)
    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            handleSave();
        } else if (event.key === 'Escape') {
            handleCancel();
        }
    };

    // Save on blur (clicking outside)
    const handleBlur = () => {
        // To avoid conflicts with potential button clicks (like Check/X buttons below), a slight delay might be needed
        // However, if only relying on Enter and Blur, save directly
        // Note: If there are other interactive elements next to TextInput, more complex logic checking relatedTarget is needed
        handleSave();
    };

    if (isEditing) {
        // Edit mode: Display TextInput and potential Save/Cancel buttons
        return (
            <Group gap="xs" wrap="nowrap" style={{ width: textInputWidth }}>
                <TextInput
                    ref={inputRef}
                    value={value}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    onBlur={handleBlur}
                    placeholder={placeholder}
                    styles={{ input: { fontWeight } }}
                    // variant="unstyled" // Can make the input look more like text, use as needed
                    // autoFocus // Mantine's autoFocus property
                />
            </Group>
        );
    } else {
        // Display mode: Show text and edit button
        return (
            <Group
                gap="xs"
                wrap="nowrap"
                flex="1"
                p="0"
                onClick={handleEditClick} // Clicking the text area can also start editing (optional)
                style={{
                    cursor: 'pointer',
                    padding: `calc(${theme.spacing.xs} / 2) ${theme.spacing.xs}`, // Simulate input padding to reduce jumping during switching
                    minHeight: '36px', // Set minimum height to roughly match TextInput's default height
                    display: 'flex',
                    alignItems: 'center',
                    borderRadius: theme.radius.sm,
                    '&:hover': {
                        // Provide some feedback on hover
                        backgroundColor: theme.colors.gray[0],
                    },
                }}
            >
                <Text fw={fontWeight} style={{ flexGrow: 1, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {value || emptyPlaceholder}
                </Text>
                <ActionIcon
                    variant={iconVariant}
                    color={iconVariant == 'subtle' ? 'gray' : undefined} // special case for account-info
                    onClick={e => {
                        e.stopPropagation();
                        handleEditClick();
                    }}
                    title="Edit"
                >
                    <MdOutlineDriveFileRenameOutline size={16} />
                </ActionIcon>
            </Group>
        );
    }
}

export default InlineEdit;
