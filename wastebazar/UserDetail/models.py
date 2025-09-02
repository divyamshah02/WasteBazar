from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
import random
import string
from dateutil.relativedelta import relativedelta

# Utility to generate custom user_id
def generate_user_id(role):
    from .models import User  # To avoid circular import inside models.py

    prefix_map = {
        'buyer_individual': 'BI',
        'buyer_corporate': 'BC',
        'seller_individual': 'SI',
        'seller_corporate': 'SC',
        'admin': 'AD',
    }
    prefix = prefix_map.get(role, 'XX')

    while True:
        suffix = ''.join(random.choices(string.digits, k=10))
        user_id = f"{prefix}{suffix}"
        if not User.objects.filter(user_id=user_id).exists():
            return user_id

# Custom User model
class User(AbstractUser):
    USER_ROLES = [
        ('admin', 'Admin'),
        ('buyer_individual', 'Buyer - Individual'),
        ('buyer_corporate', 'Buyer - Corporate'),
        ('seller_individual', 'Seller - Individual'),
        ('seller_corporate', 'Seller - Corporate'),
    ]

    user_id = models.CharField(max_length=20, unique=True, editable=False)
    role = models.CharField(max_length=20, choices=USER_ROLES)
    name = models.CharField(max_length=255)
    contact_number = models.CharField(max_length=15, unique=True)
    email = models.EmailField(unique=True, null=True, blank=True)
    pan_number = models.CharField(max_length=20, blank=True, null=True)
    aadhar_number = models.CharField(max_length=12, blank=True, null=True)
    addressline1 = models.TextField(blank=True, null=True)
    addressline2 = models.TextField(blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=100, blank=True, null=True)
    address_pincode = models.CharField(max_length=10, blank=True, null=True)
    is_approved = models.BooleanField(default=False)
    profile_completed = models.BooleanField(default=False)
    preferred_category = models.BigIntegerField(null=True)
    is_deleted = models.BooleanField(default=False)

    # Override save to assign user_id automatically
    def save(self, *args, **kwargs):
        if not self.user_id:
            new_user_id = generate_user_id(self.role)
            self.user_id = new_user_id
            self.username = new_user_id

        # if self.role in ['buyer_corporate', 'seller_corporate']:
        # if self.role != 'buyer_corporate':
        #     self.is_approved = True

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.user_id})"


# Corporate Buyer Additional Details
class CorporateUserDetail(models.Model):
    user_id = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=255)
    contact_number = models.CharField(max_length=15, unique=True)
    email = models.EmailField(unique=True)
    company_name = models.CharField(max_length=255)
    pan_number = models.CharField(max_length=20,blank=True,null=True)
    aadhar_number = models.CharField(max_length=12, blank=True, null=True)
    cin_number = models.CharField(max_length=21, blank=True, null=True)
    gst_number = models.CharField(max_length=20, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=100, blank=True, null=True)
    addressline1 = models.TextField(blank=True, null=True)
    addressline2 = models.TextField(blank=True, null=True)
    address_pincode = models.CharField(max_length=10, blank=True, null=True)
    certificate_url = models.URLField(blank=True, null=True)  # S3 link or similar
    is_approved = models.BooleanField(default=False)
    approved_at = models.DateTimeField(blank=True, null=True)
    is_rejected = models.BooleanField(default=False)
    rejected_at = models.DateTimeField(blank=True, null=True)
    rejection_reason = models.TextField(blank=True, null=True)
    requested_at = models.DateTimeField(auto_now_add=True)
    is_deleted = models.BooleanField(default=False)

    def __str__(self):
        return f"Corporate Info for {self.user_id}"


# OTP Verification Model
class OTPVerification(models.Model):    
    mobile = models.CharField(max_length=15)
    otp = models.CharField(max_length=6)    
    
    is_verified = models.BooleanField(default=False)
    attempt_count = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    def __str__(self):
        return f"{self.mobile} - {self.otp}"



# Wallet Model for Buyer Credits
class Wallet(models.Model):
    USER_ROLES = [
        ('admin', 'Admin'),
        ('buyer_individual', 'Buyer - Individual'),
        ('buyer_corporate', 'Buyer - Corporate'),
        ('seller_individual', 'Seller - Individual'),
        ('seller_corporate', 'Seller - Corporate'),
    ]
    user_id = models.CharField(max_length=20, unique=True)
    role = models.CharField(max_length=20, choices=USER_ROLES)
    
    # Separate fields for free and paid credits
    free_credits = models.PositiveIntegerField(default=0)
    paid_credits = models.PositiveIntegerField(default=0)
    
    # For credit purchases (tracking the date when credits were last purchased)
    last_credit_purchase = models.DateTimeField(blank=True, null=True)
    
    # Fields for tracking the free credit reset
    last_free_credit_reset = models.DateTimeField(auto_now_add=True)
    free_credit_reset_date = models.DateTimeField()
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def save(self, *args, **kwargs):
        # Set free_credit_reset_date based on role if not already set
        self.last_credit_purchase = timezone.now()
        if not self.free_credit_reset_date:
            if self.role == 'buyer_individual':
                # Individual buyers: 365 days from creation
                self.free_credit_reset_date = timezone.now() + relativedelta(days=365)
            elif self.role == 'buyer_corporate':
                # Corporate buyers: 1 month from creation
                self.free_credit_reset_date = timezone.now() + relativedelta(months=1)
        
        super().save(*args, **kwargs)
    
    def reset_free_credits_if_due(self):
        """Reset free credits if the reset date has passed"""
        current_time = timezone.now()
        
        # Check if reset date has passed (including today)
        if current_time.date() >= self.free_credit_reset_date.date():
            if self.role == 'buyer_individual':
                self.free_credits = 5
                self.free_credit_reset_date = current_time + relativedelta(days=365)
            elif self.role == 'buyer_corporate':
                self.free_credits = 3
                self.free_credit_reset_date = current_time + relativedelta(months=1)
            
            self.last_free_credit_reset = current_time
            self.save()
            return True
        return False
 
    # def deduct_credits(self, amount):
    #     """Deduct credits (first from free, then from paid)"""
    #     if self.get_total_credits() < amount:
    #         return False
        
    #     # First deduct from free credits
    #     if self.free_credits >= amount:
    #         self.free_credits -= amount
    #     else:
    #         # Deduct remaining from paid credits
    #         remaining = amount - self.free_credits
    #         self.free_credits = 0
    #         self.paid_credits -= remaining
        
    #     self.save()
    #     return True
 
    def __str__(self):
        return f"Wallet for {self.user_id} - Free: {self.free_credits}, Paid: {self.paid_credits}"

