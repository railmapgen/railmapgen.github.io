export function appleBuildNumber(value = '1') {
    if (typeof value !== 'string' || value.trim() !== value || !/^(0|[1-9]\d*)(\.(0|[1-9]\d*)){0,2}$/.test(value))
        throw new Error(
            'Choose an Apple build number with one to three integers, such as 4 or 84.1, without leading zeros.'
        );
    return value;
}

export function resolveAppleBuildNumber(value, environment = {}) {
    return appleBuildNumber(value ?? environment.RMT_APPLE_BUILD_NUMBER);
}
