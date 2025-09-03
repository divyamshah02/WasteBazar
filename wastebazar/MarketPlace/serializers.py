from rest_framework import serializers
from .models import Category, SubCategory, SellerListing, BuyerRequirement


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'


class SubCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = SubCategory
        fields = '__all__'


class SellerListingSerializer(serializers.ModelSerializer):
    category_name = serializers.SerializerMethodField()
    subcategory_name = serializers.SerializerMethodField()
    
    class Meta:
        model = SellerListing
        fields = '__all__'
    
    def get_category_name(self, obj):
        """Get category name from category_id"""
        try:
            category = Category.objects.get(category_id=obj.category_id)
            return category.title
        except Category.DoesNotExist:
            return None
    
    def get_subcategory_name(self, obj):
        """Get subcategory name from subcategory_id"""
        try:
            subcategory = SubCategory.objects.get(sub_category_id=obj.subcategory_id)
            return subcategory.title
        except SubCategory.DoesNotExist:
            return None


class BuyerRequirementSerializer(serializers.ModelSerializer):
    category_name = serializers.SerializerMethodField()
    subcategory_name = serializers.SerializerMethodField()
    
    class Meta:
        model = BuyerRequirement
        fields = '__all__'
    
    def get_category_name(self, obj):
        """Get category name from category_id"""
        try:
            category = Category.objects.get(category_id=obj.category_id)
            return category.title
        except Category.DoesNotExist:
            return None
    
    def get_subcategory_name(self, obj):
        """Get subcategory name from subcategory_id"""
        try:
            subcategory = SubCategory.objects.get(sub_category_id=obj.subcategory_id)
            return subcategory.title
        except SubCategory.DoesNotExist:
            return None
