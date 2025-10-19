export const getFullName = (firstName: string, middleName?: string, lastName?: string): string => {
    return [firstName, middleName, lastName].filter(Boolean).join(' ');
};
