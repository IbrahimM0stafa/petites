export interface CouponValidationResponse {
	valid: boolean;
	couponId: string | null;
	code: string;
	discountAmount: number;
	finalAmount: number;
	message: string;
}