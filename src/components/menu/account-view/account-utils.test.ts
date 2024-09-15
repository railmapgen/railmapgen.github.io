import { emailValidator, passwordValidator } from './account-utils';

describe('AccountUtils', () => {
    it('#121 Email validator', () => {
        expect(emailValidator('a@b.c')).toBeTruthy();
        expect(emailValidator('')).toBeFalsy();
        expect(emailValidator('a')).toBeFalsy();
        expect(emailValidator('a@b')).toBeFalsy();
        expect(emailValidator('b.c')).toBeFalsy();
    });

    it('#121 Password validator', () => {
        expect(passwordValidator('abcd1234')).toBeTruthy();
        expect(passwordValidator('')).toBeFalsy();
        expect(passwordValidator('abcdefgh')).toBeFalsy();
        expect(passwordValidator('12345678')).toBeFalsy();
        expect(passwordValidator('abc123')).toBeFalsy();
    });
});
