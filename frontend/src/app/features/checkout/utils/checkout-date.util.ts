export class CheckoutDateUtil {
	private static readonly DAYS_OF_WEEK = [
		'SUNDAY',
		'MONDAY',
		'TUESDAY',
		'WEDNESDAY',
		'THURSDAY',
		'FRIDAY',
		'SATURDAY'
	];

	static getTodayCairoFormatted(): string {
		const options: Intl.DateTimeFormatOptions = {
			timeZone: 'Africa/Cairo',
			year: 'numeric',
			month: '2-digit',
			day: '2-digit'
		};
		const formatter = new Intl.DateTimeFormat('fr-CA', options);
		return formatter.format(new Date());
	}

	static formatCheckoutDate(value: string): string {
		const date = new Date(`${value}T00:00:00`);
		if (Number.isNaN(date.getTime())) {
			return value;
		}

		return new Intl.DateTimeFormat('en-EG', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		}).format(date);
	}

	static isDateBlocked(dateStr: string | null, blockedDays: string[]): boolean {
		if (!dateStr) return false;
		const parts = dateStr.split('-');
		if (parts.length !== 3) return false;

		const year = parseInt(parts[0], 10);
		const month = parseInt(parts[1], 10) - 1;
		const day = parseInt(parts[2], 10);
		const date = new Date(year, month, day);

		if (isNaN(date.getTime())) return false;

		const selectedDayName = CheckoutDateUtil.DAYS_OF_WEEK[date.getDay()];
		return blockedDays.includes(selectedDayName);
	}
}

