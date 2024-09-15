const EMAIL_REGEX = /^\S+@\S+\.\S+$/;
export const emailValidator = (value: string): boolean => !!value.match(EMAIL_REGEX);

export const passwordValidator = (value: string): boolean =>
    value.length >= 8 && !!value.match(/\d/) && !!value.match(/[a-zA-Z]/);
