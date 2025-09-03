from rest_framework import serializers
from .models import User, CorporateUserDetail, OTPVerification, Wallet


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'user_id',
            'role',
            'name',
            'contact_number',
            'email',
            'pan_number',
            'aadhar_number',
            'addressline1',
            'addressline2',
            'city',
            'state',
            'address_pincode',
            'username',
            'is_deleted',
        ]
        read_only_fields = ['user_id']


class CorporateUserDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = CorporateUserDetail
        fields = [
            'user_id',
            'name',
            'contact_number',
            'email',
            'company_name',
            'pan_number',
            'aadhar_number',
            'cin_number',
            'gst_number',
            'city',
            'state',
            'addressline1',
            'addressline2',
            'address_pincode',
            'certificate_url',
            'is_approved',
            'rejection_reason',
            'requested_at',
            'approved_at',
            'is_deleted',
        ]
        read_only_fields = ['requested_at', 'approved_at']


class OTPVerificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = OTPVerification
        fields = [
            'mobile',
            'otp',
            'is_verified',
            'attempt_count',
            'created_at',
            'expires_at',
        ]
        read_only_fields = ['created_at', 'expires_at', 'attempt_count', 'is_verified']

class WalletSerializer(serializers.ModelSerializer):
    class Meta:
        model = Wallet
        fields = [
            'user_id',
            'role',
            'free_credits',
            'paid_credits',
            'last_free_credit_reset',
            'free_credit_reset_date',
            'created_at'
        ]
        read_only_fields = ['user_id', 'created_at']