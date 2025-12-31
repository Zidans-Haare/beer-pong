export function isAdmin(email: string | null | undefined): boolean {
    if (!email) return false;
    return email === process.env.ADMIN_EMAIL;
}
