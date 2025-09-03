from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import *

router = DefaultRouter()
router.register(r'', HomeViewSet, basename='home')
router.register(r'marketplace', ListingsViewSet, basename='MarketPlace')
router.register(r'requirements', RequirementsViewSet, basename='requirements')
router.register(r'listing-detail', ListingDetailViewSet, basename='listing_detail')
router.register(r'register', LoginViewSet, basename='login')
router.register(r'buyer-profile', BuyerProfileViewSet, basename='buyer_profile')
router.register(r'seller-profile', SellerProfileViewSet, basename='seller_profile')
router.register(r'profile', ProfilePageViewSet, basename='profile')
router.register(r'directlogin', directloginViewSet, basename='directlogin')
router.register(r'listing-form', ListingFormViewSet, basename='listing_form')
router.register(r'listing-edit', ListingEditViewSet, basename='listing_edit')
router.register(r'requirement-form', RequirementFormViewSet, basename='requirement_form')
router.register(r'dashboard', AdminDashboardViewSet, basename='dashboard')


urlpatterns = [
    path('', include(router.urls)),
]
