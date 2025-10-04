/**
 * Phone number normalization utility
 * Handles various phone number formats and normalizes them for SMS sending
 */

export class PhoneUtil {
    /**
     * Normalize phone number for SMS sending
     * Removes all non-digit characters and ensures proper format
     * 
     * @param phoneNumber - Raw phone number from database
     * @returns Normalized phone number (digits only)
     */
    static normalizePhoneNumber(phoneNumber: string): string {
        if (!phoneNumber) {
            return '';
        }

        // Remove all non-digit characters (spaces, dashes, parentheses, plus signs, etc.)
        const digitsOnly = phoneNumber.replace(/\D/g, '');

        // Check if it already starts with 998
        if (digitsOnly.startsWith('998')) {
            // If it's exactly 12 digits, return as-is
            if (digitsOnly.length === 12) {
                return digitsOnly;
            }
            // If it's longer than 12, truncate to 12
            if (digitsOnly.length > 12) {
                return digitsOnly.substring(0, 12);
            }
            // If it's shorter than 12, add missing digits (this shouldn't happen with 998 prefix)
            return digitsOnly;
        }

        // If it doesn't start with 998, add 998 prefix
        const with998Prefix = `998${digitsOnly}`;
        
        // Ensure it's exactly 12 digits
        if (with998Prefix.length === 12) {
            return with998Prefix;
        } else if (with998Prefix.length > 12) {
            return with998Prefix.substring(0, 12);
        } else {
            // If still too short, return as-is (invalid format)
            return with998Prefix;
        }
    }

    /**
     * Validate if phone number is in correct format for SMS
     * 
     * @param phoneNumber - Normalized phone number
     * @returns true if valid, false otherwise
     */
    static isValidPhoneNumber(phoneNumber: string): boolean {
        if (!phoneNumber) {
            return false;
        }

        // Should be exactly 12 digits starting with 998
        return /^998\d{9}$/.test(phoneNumber);
    }

    /**
     * Format phone number for display
     * 
     * @param phoneNumber - Normalized phone number
     * @returns Formatted phone number for display
     */
    static formatForDisplay(phoneNumber: string): string {
        if (!phoneNumber || phoneNumber.length !== 12) {
            return phoneNumber;
        }

        // Format: 998901234567 -> +998 90 123 45 67
        return `+${phoneNumber.substring(0, 3)} ${phoneNumber.substring(3, 5)} ${phoneNumber.substring(5, 8)} ${phoneNumber.substring(8, 10)} ${phoneNumber.substring(10, 12)}`;
    }
}
