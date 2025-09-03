from django.contrib import admin
from .models import Category, SubCategory, SellerListing, BuyerRequirement


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['category_id', 'title', 'is_active', 'created_at']
    search_fields = ['category_id', 'title']
    list_filter = ['is_active']


@admin.register(SubCategory)
class SubCategoryAdmin(admin.ModelAdmin):
    list_display = ['sub_category_id', 'title', 'category_id', 'is_active', 'created_at']
    search_fields = ['sub_category_id', 'title']
    list_filter = ['is_active', 'category_id']


@admin.register(SellerListing)
class SellerListingAdmin(admin.ModelAdmin):
    list_display = ['listing_id', 'seller_user_id', 'get_category_name', 'get_subcategory_name', 'quantity', 'unit', 'status', 'created_at']
    search_fields = ['listing_id', 'seller_user_id', 'category_id', 'subcategory_id']
    list_filter = ['status', 'is_deleted', 'created_at', 'category_id', 'subcategory_id']
    readonly_fields = ['listing_id', 'created_at', 'updated_at']
    
    def get_category_name(self, obj):
        """Display category name in admin"""
        return obj.get_category_name()
    get_category_name.short_description = 'Category'
    
    def get_subcategory_name(self, obj):
        """Display subcategory name in admin"""
        return obj.get_subcategory_name()
    get_subcategory_name.short_description = 'Subcategory'


@admin.register(BuyerRequirement)
class BuyerRequirementAdmin(admin.ModelAdmin):
    list_display = ['requirement_id', 'buyer_user_id', 'get_category_name', 'get_subcategory_name', 'quantity', 'unit', 'status', 'created_at']
    search_fields = ['requirement_id', 'buyer_user_id', 'category_id', 'subcategory_id']
    list_filter = ['status', 'created_at', 'category_id', 'subcategory_id']
    readonly_fields = ['requirement_id', 'created_at', 'updated_at']
    
    def get_category_name(self, obj):
        """Display category name in admin"""
        return obj.get_category_name()
    get_category_name.short_description = 'Category'
    
    def get_subcategory_name(self, obj):
        """Display subcategory name in admin"""
        return obj.get_subcategory_name()
    get_subcategory_name.short_description = 'Subcategory'
