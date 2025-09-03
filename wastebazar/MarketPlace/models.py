from django.db import models
from django.utils import timezone

import random
import string
from datetime import timedelta


def generate_category_id():
    """Generate unique 10-digit category ID starting with 10"""
    from .models import Category
    while True:
        # Generate 10-digit ID starting with '10' followed by 8 random digits
        category_id = int('10' + ''.join(random.choices(string.digits, k=8)))
        if not Category.objects.filter(category_id=category_id).exists():
            return category_id


class Category(models.Model):
    category_id = models.BigIntegerField(unique=True)  # 10-digit
    title = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)

    def save(self, *args, **kwargs):
        if not self.category_id:
            self.category_id = generate_category_id()
        super().save(*args, **kwargs)


    def __str__(self):
        return f"{self.category_id} - {self.title}"



def generate_subcategory_id():
    """Generate unique 10-digit subcategory ID starting with 20"""
    from .models import SubCategory
    while True:
        # Generate 10-digit ID starting with '20' followed by 8 random digits
        subcategory_id = int('20' + ''.join(random.choices(string.digits, k=8)))
        if not SubCategory.objects.filter(sub_category_id=subcategory_id).exists():
            return subcategory_id


class SubCategory(models.Model):
    category_id = models.BigIntegerField()
    sub_category_id = models.BigIntegerField(unique=True)  # 10-digit
    title = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)

    def save(self, *args, **kwargs):
        if not self.sub_category_id:
            self.sub_category_id = generate_subcategory_id()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.sub_category_id} - {self.title}"



def generate_listing_id():
    from .models import SellerListing
    while True:
        listing_id = ''.join(random.choices(string.digits, k=10))
        if not SellerListing.objects.filter(listing_id=listing_id).exists():
            return listing_id


class SellerListing(models.Model):
    PACKED_TYPE_CHOICES = [
        ('bags', 'Bags'),
        ('box', 'Box'),
        ('lumps', 'Lumps'),
        ('rolls', 'Rolls'),
    ]

    STORED_CHOICES = [
        ('indoor', 'Indoor'),
        ('outdoor', 'Outdoor'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('auto_approved', 'Auto Approved'),
        ('approved', 'Approved'),
        ('inactive', 'Inactive'),
        ('sold', 'Sold'),
        ('deleted', 'Deleted'),
    ]

    listing_id = models.CharField(max_length=15)
    category_id = models.BigIntegerField(null=True)  # Reference to Category.category_id
    subcategory_id = models.BigIntegerField(null=True)  # Reference to SubCategory.sub_category_id
    listing_name = models.CharField(max_length=255, blank=True, null=True)  # Optional listing name field
    seller_user_id = models.CharField(max_length=15)
    seller_name= models.CharField(max_length=255, blank=True, null=True)  # Optional seller name field
    quantity = models.FloatField()
    unit = models.CharField(max_length=20)  # e.g. kg, tons
    priceperunit = models.FloatField(default=0.0)  # Price per unit
    description = models.TextField(blank=True)
    
    city_location = models.CharField(max_length=100)
    state_location = models.CharField(max_length=100)
    pincode_location = models.CharField(max_length=100)
    address = models.TextField()

    # Waste packaging and storage details
    waste_packed_type = models.CharField(
        max_length=20,
        choices=PACKED_TYPE_CHOICES,
        null=True,
        blank=True,
        default='bags'
    )
    waste_stored = models.CharField(
        max_length=10,
        choices=STORED_CHOICES,
        null=True,
        blank=True,
        default='indoor'
    )

    # Image fields for S3 URLs
    featured_image_url = models.URLField(max_length=500, null=True, blank=True)
    gallery_images = models.JSONField(default=list, blank=True)  # List of gallery image URLs

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    auto_approved_at = models.DateTimeField(null=True, blank=True)
    reminder_sent_at = models.DateTimeField(null=True, blank=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    is_deleted = models.BooleanField(default=False)
    revived_at = models.DateTimeField(null=True, blank=True)  # Remove auto_now_add=True
    valid_until = models.DateTimeField(null=True, blank=True)

    def save(self, *args, **kwargs):
        # Generate listing_id if not present
        if not self.listing_id:
            new_listing_id = generate_listing_id()
            self.listing_id = new_listing_id

        # For new listings, set revived_at to current time
        if not self.pk and not self.revived_at:  # New instance without revived_at
            self.revived_at = timezone.now()

        # Automatically calculate valid_until whenever revived_at is set
        if self.revived_at:
            self.valid_until = self.revived_at + timedelta(days=7)

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.listing_id} - {self.get_category_name()}/{self.get_subcategory_name()}"

    def get_category_name(self):
        """Get category name from category_id"""
        try:
            category = Category.objects.get(category_id=self.category_id)
            return category.title
        except Category.DoesNotExist:
            return f"Category ID: {self.category_id}"

    def get_subcategory_name(self):
        """Get subcategory name from subcategory_id"""
        try:
            subcategory = SubCategory.objects.get(sub_category_id=self.subcategory_id)
            return subcategory.title
        except SubCategory.DoesNotExist:
            return f"Subcategory ID: {self.subcategory_id}"

    def is_expired(self):
        """Check if the listing has expired"""
        if self.valid_until:
            return timezone.now() > self.valid_until
        return False

    def days_until_expiry(self):
        """Get number of days until listing expires"""
        if self.valid_until:
            delta = self.valid_until - timezone.now()
            return max(0, delta.days)
        return 0

    def revive_listing(self):
        """Revive an expired listing for another 7 days"""
        self.revived_at = timezone.now()
        # valid_until will be automatically calculated in save() method
        self.save()



def generate_requirement_id():
    from .models import BuyerRequirement
    while True:
        requirement_id = ''.join(random.choices(string.digits, k=10))
        if not BuyerRequirement.objects.filter(requirement_id=requirement_id).exists():
            return requirement_id


class BuyerRequirement(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('requirementfulfilled', 'Requirementfulfilled'),
        ('deleted', 'Deleted'),
    ]

    requirement_id = models.CharField(max_length=15)
    category_id = models.BigIntegerField(null=True)  # Reference to Category.category_id
    subcategory_id = models.BigIntegerField(null=True)  # Reference to SubCategory.sub_category_id

    buyer_user_id = models.CharField(max_length=15)

    quantity = models.FloatField()
    unit = models.CharField(max_length=20)
    description = models.TextField(blank=True)

    city_location = models.CharField(max_length=100)
    state_location = models.CharField(max_length=100)
    pincode_location = models.CharField(max_length=100)
    address = models.TextField()


    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    # is_urgent = models.BooleanField(default=False)
    # attachment = models.FileField(upload_to="requirement_attachments/", null=True, blank=True)

    # is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    revived_at = models.DateTimeField(null=True, blank=True)  # Remove auto_now_add=True
    valid_until = models.DateTimeField(null=True, blank=True)


    def save(self, *args, **kwargs):
        if not self.requirement_id:
            new_requirement_id = generate_requirement_id()
            self.requirement_id = new_requirement_id

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.requirement_id} - {self.get_category_name()}/{self.get_subcategory_name()}"

    def get_category_name(self):
        """Get category name from category_id"""
        try:
            category = Category.objects.get(category_id=self.category_id)
            return category.title
        except Category.DoesNotExist:
            return f"Category ID: {self.category_id}"

    def get_subcategory_name(self):
        """Get subcategory name from subcategory_id"""
        try:
            subcategory = SubCategory.objects.get(sub_category_id=self.subcategory_id)
            return subcategory.title
        except SubCategory.DoesNotExist:
            return f"Subcategory ID: {self.subcategory_id}"

