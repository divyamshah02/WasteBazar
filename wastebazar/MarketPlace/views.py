from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action

from django.utils import timezone
from django.db.models import Q

from .models import SellerListing, BuyerRequirement, Category, SubCategory
from .serializers import SellerListingSerializer, BuyerRequirementSerializer, CategorySerializer, SubCategorySerializer

from utils.decorators import handle_exceptions, check_authentication

import uuid
import boto3
import base64
import json
import os


class SellerListingViewSet(viewsets.ViewSet):
    
    def upload_file_to_s3(self, uploaded_file):
        """Uploads a file to AWS S3, renaming it if a file with the same name exists."""
        region_name = "eu-north-1"
        s3_client = boto3.client(
            "s3",
            aws_access_key_id = self.decrypt("QUtJQTVJSk9YQlFVVEVFNU9NSkI="),
            aws_secret_access_key = self.decrypt("TlIwblU5T0oyQ0lkQm1nRkFXMEk4RTRiT01na3NEVXVPQnJJTU5iNQ=="),
            region_name = region_name
        )
        
        bucket_name = "sankievents"
        base_name, extension = os.path.splitext(uploaded_file.name)
        file_name = uploaded_file.name
        s3_key = f"uploads/{file_name}"
        counter = 1

        # Check if file exists and rename if necessary
        while True:
            try:
                s3_client.head_object(Bucket=bucket_name, Key=s3_key)
                # If file exists, update the filename
                file_name = f"{base_name}({counter}){extension}"
                s3_key = f"uploads/{file_name}"
                counter += 1
            except s3_client.exceptions.ClientError:
                break  # File does not exist, proceed with upload

        # Upload file
        s3_client.upload_fileobj(uploaded_file, bucket_name, s3_key)

        # Generate file URL
        file_url = f"https://{bucket_name}.s3.{region_name}.amazonaws.com/{s3_key}"

        return file_url

    def decrypt(self, b64_text):
        # Decode the Base64 string back to bytes, then to text
        return base64.b64decode(b64_text.encode()).decode()

    @handle_exceptions
    # @check_authentication(required_role='seller_corporate') 
    def list(self, request):
        """Get all listings for the authenticated seller"""
        
        # Get user_id from request data or query params
        user_id = request.data.get('user_id') if request.data else None
        if not user_id:
            user_id = request.query_params.get('user_id')
        
        if not user_id:
            return Response({
                "success": False,
                "user_not_logged_in": True,
                "user_unauthorized": False,
                "data": None,
                "error": "User ID is required in request data or query params."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validate user_id exists and is a seller
        try:
            from UserDetail.models import User
            seller = User.objects.get(
                user_id=user_id,
                role__in=['seller_individual', 'seller_corporate'],
                is_deleted=False
            )
        except User.DoesNotExist:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": f"Seller not found with ID: {user_id}"
            }, status=status.HTTP_404_NOT_FOUND)

        listings = SellerListing.objects.filter(
            seller_user_id=user_id
            # seller_user_id="SC5294468983"
        ).order_by('-created_at')
        
        serializer = SellerListingSerializer(listings, many=True)
        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": serializer.data,
            "error": None
        })

    @handle_exceptions
    # @check_authentication(required_role='seller_corporate')  # adjust if needed
    def create(self, request):
        """Create a new seller listing with image upload support"""
        data = request.data

        # Get user_id from request data
        user_id = data.get('user_id')
        if not user_id:
            return Response({
                "success": False,
                "user_not_logged_in": True,
                "user_unauthorized": False,
                "data": None,
                "error": "User ID is required in request data."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validate user_id exists and is a seller
        try:
            from UserDetail.models import User
            seller = User.objects.get(
                user_id=user_id,
                role__in=['seller_individual', 'seller_corporate'],
                is_deleted=False
            )
        except User.DoesNotExist:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": f"Seller not found with ID: {user_id}"
            }, status=status.HTTP_404_NOT_FOUND)

        required_fields = ['category_id', 'subcategory_id', 'quantity', 'unit', 'priceperunit', 'city_location', 'state_location', 'pincode_location', 'address']
        for field in required_fields:
            if not data.get(field):
                return Response({
                    "success": False,
                    "user_not_logged_in": False,
                    "user_unauthorized": False,
                    "data": None,
                    "error": f"{field} is required."
                }, status=status.HTTP_400_BAD_REQUEST)

        # Validate priceperunit is a positive number
        try:
            priceperunit = float(data['priceperunit'])
            if priceperunit < 0:
                return Response({
                    "success": False,
                    "user_not_logged_in": False,
                    "user_unauthorized": False,
                    "data": None,
                    "error": "Price per unit must be a positive number."
                }, status=status.HTTP_400_BAD_REQUEST)
        except (ValueError, TypeError):
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "Price per unit must be a valid number."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validate category_id and subcategory_id exist
        try:
            category = Category.objects.get(category_id=data['category_id'])
        except Category.DoesNotExist:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": f"Category with ID {data['category_id']} does not exist."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            subcategory = SubCategory.objects.get(sub_category_id=data['subcategory_id'])
        except SubCategory.DoesNotExist:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": f"Subcategory with ID {data['subcategory_id']} does not exist."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Create the listing first
        listing = SellerListing.objects.create(
            seller_user_id=user_id,
            # seller_user_id="SC5294468983",
            category_id=data['category_id'],
            subcategory_id=data['subcategory_id'],
            quantity=data['quantity'],
            unit=data['unit'],
            listing_name=data['listing_name'],
            priceperunit=data['priceperunit'],
            seller_name=data.get('seller_name', ''),
            description=data.get('description', ''),
            city_location=data['city_location'],
            state_location=data['state_location'],
            pincode_location=data['pincode_location'],
            address=data['address'],
            waste_packed_type=data.get('waste_packed_type') or None,
            waste_stored=data.get('waste_stored') or None,
            status='pending'
        )

        # Handle image uploads
        uploaded_images = []
        
        # Handle featured image
        featured_image = request.FILES.get('featured_image')
        if featured_image:
            try:
                featured_image_url = self.upload_file_to_s3(featured_image)
                listing.featured_image_url = featured_image_url
                uploaded_images.append({"type": "featured", "url": featured_image_url})
            except Exception as e:
                # If image upload fails, we can still create the listing without images
                print(f"Failed to upload featured image: {str(e)}")

        # Handle gallery images (up to 5)
        gallery_urls = []
        for i in range(1, 6):  # gallery_image_1 to gallery_image_5
            gallery_image = request.FILES.get(f'gallery_image_{i}')
            if gallery_image:
                try:
                    gallery_image_url = self.upload_file_to_s3(gallery_image)
                    gallery_urls.append(gallery_image_url)
                    uploaded_images.append({"type": f"gallery_{i}", "url": gallery_image_url})
                except Exception as e:
                    print(f"Failed to upload gallery image {i}: {str(e)}")
        
        # Save gallery images to the JSONField
        if gallery_urls:
            listing.gallery_images = gallery_urls

        # Save the listing with image URLs
        listing.save()

        serializer = SellerListingSerializer(listing)
        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": serializer.data,
            "meta": {
                "uploaded_images": uploaded_images,
                "total_images": len(uploaded_images)
            },
            "error": None
        }, status=status.HTTP_201_CREATED)
    
    @handle_exceptions
    # @check_authentication(required_role='seller_corporate')
    def retrieve(self, request, pk=None):
        """Get all listings for a specific seller user_id"""
        user_id = pk
        
        if not user_id:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "User ID is required."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate user_id exists and is a seller
        try:
            from UserDetail.models import User
            seller = User.objects.get(
                user_id=user_id,
                role__in=['seller_individual', 'seller_corporate'],
                is_deleted=False
            )
        except User.DoesNotExist:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": f"Seller not found with ID: {user_id}"
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Get all listings for this seller
        listings = SellerListing.objects.filter(
            seller_user_id=user_id
        ).order_by('-created_at')
        
        serializer = SellerListingSerializer(listings, many=True)
        
        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": serializer.data,
            "error": None,
            "meta": {
                "seller_id": user_id,
                "seller_role": seller.role,
                "total_listings": listings.count(),
                "pending_listings": listings.filter(status='pending').count(),
                "approved_listings": listings.filter(status='approved').count(),
                "rejected_listings": listings.filter(status='rejected').count(),
                "sold_listings": listings.filter(status='sold').count()
            }
        })
    
# ///sldfsfds;fdsf
    @handle_exceptions
    # @check_authentication(required_role='seller_corporate')
    def update(self, request, pk=None):
        """Update an existing seller listing - Enhanced author validation"""
        
        # Get user_id from request data first
        user_id = request.data.get('user_id')
        if not user_id:
            return Response({
                "success": False,
                "user_not_logged_in": True,
                "user_unauthorized": False,
                "data": None,
                "error": "User ID is required in request data."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Step 1: Check if listing exists at all
        try:
            listing_exists = SellerListing.objects.get(listing_id=pk)
        except SellerListing.DoesNotExist:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "Listing not found."
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Step 2: Check if current user owns this listing
        if listing_exists.seller_user_id != user_id:
        # if listing_exists.seller_user_id != "SC5294468983":
            
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": True,  # More specific error flag
                "data": None,
                "error": "You don't have permission to edit this listing. Only the original author can modify their listings."
            }, status=status.HTTP_403_FORBIDDEN)  # 403 is more appropriate than 404
        
        listing = listing_exists  # Use the found listing
        
        # Step 3: Check if listing can be updated (status validation)
        if listing.status not in ['pending', 'rejected']:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": f"Cannot update {listing.status} listings. Only pending or rejected listings can be updated."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Step 4: Validate and update fields
        data = request.data
        if not data:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "No data provided for update."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        updatable_fields = ['category_id', 'subcategory_id', 'quantity', 'unit', 'priceperunit', 'seller_name', 'description', 
                        'city_location', 'state_location', 'pincode_location', 'address']
        
        updated_fields = []
        for field in updatable_fields:
            if field in data:
                # Validate category_id and subcategory_id if they are being updated
                if field == 'category_id':
                    try:
                        Category.objects.get(category_id=data[field])
                    except Category.DoesNotExist:
                        return Response({
                            "success": False,
                            "user_not_logged_in": False,
                            "user_unauthorized": False,
                            "data": None,
                            "error": f"Category with ID {data[field]} does not exist."
                        }, status=status.HTTP_400_BAD_REQUEST)
                
                if field == 'subcategory_id':
                    try:
                        SubCategory.objects.get(sub_category_id=data[field])
                    except SubCategory.DoesNotExist:
                        return Response({
                            "success": False,
                            "user_not_logged_in": False,
                            "user_unauthorized": False,
                            "data": None,
                            "error": f"Subcategory with ID {data[field]} does not exist."
                        }, status=status.HTTP_400_BAD_REQUEST)
                
                if field == 'priceperunit':
                    try:
                        priceperunit = float(data[field])
                        if priceperunit < 0:
                            return Response({
                                "success": False,
                                "user_not_logged_in": False,
                                "user_unauthorized": False,
                                "data": None,
                                "error": "Price per unit must be a positive number."
                            }, status=status.HTTP_400_BAD_REQUEST)
                    except (ValueError, TypeError):
                        return Response({
                            "success": False,
                            "user_not_logged_in": False,
                            "user_unauthorized": False,
                            "data": None,
                            "error": "Price per unit must be a valid number."
                        }, status=status.HTTP_400_BAD_REQUEST)
                
                setattr(listing, field, data[field])
                updated_fields.append(field)

        # Handle image uploads during update
        uploaded_images = []
        
        # Handle featured image update
        featured_image = request.FILES.get('featured_image')
        if featured_image:
            try:
                featured_image_url = self.upload_file_to_s3(featured_image)
                listing.featured_image_url = featured_image_url
                uploaded_images.append({"type": "featured", "url": featured_image_url})
                updated_fields.append('featured_image_url')
            except Exception as e:
                print(f"Failed to upload featured image during update: {str(e)}")
        
        # Handle featured image removal
        remove_featured_image = data.get('remove_featured_image')
        if remove_featured_image == 'true':
            listing.featured_image_url = None
            updated_fields.append('featured_image_url')

        # Handle gallery images update
        gallery_urls = list(listing.gallery_images) if listing.gallery_images else []
        gallery_updated = False
        
        for i in range(1, 6):  # gallery_image_1 to gallery_image_5
            gallery_image = request.FILES.get(f'gallery_image_{i}')
            if gallery_image:
                try:
                    gallery_image_url = self.upload_file_to_s3(gallery_image)
                    # Add new gallery image (up to 5 total)
                    if len(gallery_urls) < 5:
                        gallery_urls.append(gallery_image_url)
                        uploaded_images.append({"type": f"gallery_{i}", "url": gallery_image_url})
                        gallery_updated = True
                except Exception as e:
                    print(f"Failed to upload gallery image {i} during update: {str(e)}")
        
        # Check if user wants to remove specific gallery images
        remove_gallery_urls_json = data.get('remove_gallery_images')
        if remove_gallery_urls_json:
            try:
                import json
                remove_gallery_urls = json.loads(remove_gallery_urls_json)
                for url_to_remove in remove_gallery_urls:
                    if url_to_remove in gallery_urls:
                        gallery_urls.remove(url_to_remove)
                        gallery_updated = True
            except (json.JSONDecodeError, TypeError):
                print(f"Failed to parse remove_gallery_images: {remove_gallery_urls_json}")
        
        if gallery_updated:
            listing.gallery_images = gallery_urls
            updated_fields.append('gallery_images')
        
        if not updated_fields:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "No valid fields provided for update."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Step 5: Reset status to pending if it was rejected
        if listing.status != 'pending':
            listing.status = 'pending'
            updated_fields.append('status')
        
        listing.updated_at = timezone.now()
        listing.save()

        serializer = SellerListingSerializer(listing)
        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": {
                "listing": serializer.data,
                "updated_fields": updated_fields,
                "message": "Listing updated successfully by author."
            },
            "meta": {
                "uploaded_images": uploaded_images,
                "total_images_uploaded": len(uploaded_images)
            },
            "error": None
        })


    


    @handle_exceptions
    # @check_authentication(required_role='seller_corporate')
    def partial_update(self, request, pk=None):
        """Mark a listing as sold"""
        
        # Get user_id from request data
        user_id = request.data.get('user_id')
        if not user_id:
            return Response({
                "success": False,
                "user_not_logged_in": True,
                "user_unauthorized": False,
                "data": None,
                "error": "User ID is required in request data."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validate user_id exists and is a seller
        try:
            from UserDetail.models import User
            seller = User.objects.get(
                user_id=user_id,
                role__in=['seller_individual', 'seller_corporate'],
                is_deleted=False
            )
        except User.DoesNotExist:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": f"Seller not found with ID: {user_id}"
            }, status=status.HTTP_404_NOT_FOUND)

        try:
            listing = SellerListing.objects.get(
                listing_id=pk, 
                seller_user_id=user_id,
                # seller_user_id="SC5294468983",
                status='approved'
            )
        except SellerListing.DoesNotExist:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "Listing not found or cannot be marked as sold."
            }, status=status.HTTP_404_NOT_FOUND)

        listing.status = 'sold'
        listing.updated_at = timezone.now()
        listing.save()

        serializer = SellerListingSerializer(listing)
        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": serializer.data,
            "error": None
        })

    # @handle_exceptions
    # # @check_authentication(required_role='seller_corporate')
    # @action(detail=True, methods=['delete'])
    # def delete_listing(self, request, pk=None):
    #     """Delete a listing (only if pending or rejected)"""
    #     try:
    #         listing = SellerListing.objects.get(
    #             listing_id=pk, 
    #             seller_user_id="SC5294468983"  # request.user.user_id
    #         )
    #     except SellerListing.DoesNotExist:
    #         return Response({
    #             "success": False,
    #             "user_not_logged_in": False,
    #             "user_unauthorized": False,
    #             "data": None,
    #             "error": "Listing not found."
    #         }, status=status.HTTP_404_NOT_FOUND)

    #     if listing.status not in ['pending', 'rejected']:
    #         return Response({
    #             "success": False,
    #             "user_not_logged_in": False,
    #             "user_unauthorized": False,
    #             "data": None,
    #             "error": "Cannot delete approved or sold listings."
    #         }, status=status.HTTP_400_BAD_REQUEST)

    #     listing.delete()
    #     return Response({
    #         "success": True,
    #         "user_not_logged_in": False,
    #         "user_unauthorized": False,
    #         "data": None,
    #         "error": None
    #     }, status=status.HTTP_204_NO_CONTENT)


class SellerListingDetailViewset(viewsets.ViewSet):
    
    def upload_file_to_s3(self, uploaded_file):
        """Uploads a file to AWS S3, renaming it if a file with the same name exists."""
        region_name = "eu-north-1"
        s3_client = boto3.client(
            "s3",
            aws_access_key_id = self.decrypt("QUtJQTVJSk9YQlFVVEVFNU9NSkI="),
            aws_secret_access_key = self.decrypt("TlIwblU5T0oyQ0lkQm1nRkFXMEk4RTRiT01na3NEVXVPQnJJTU5iNQ=="),
            region_name = region_name
        )
        
        bucket_name = "sankievents"
        base_name, extension = os.path.splitext(uploaded_file.name)
        file_name = uploaded_file.name
        s3_key = f"uploads/{file_name}"
        counter = 1

        # Check if file exists and rename if necessary
        while True:
            try:
                s3_client.head_object(Bucket=bucket_name, Key=s3_key)
                # If file exists, update the filename
                file_name = f"{base_name}({counter}){extension}"
                s3_key = f"uploads/{file_name}"
                counter += 1
            except s3_client.exceptions.ClientError:
                break  # File does not exist, proceed with upload

        # Upload file
        s3_client.upload_fileobj(uploaded_file, bucket_name, s3_key)

        # Generate file URL
        file_url = f"https://{bucket_name}.s3.{region_name}.amazonaws.com/{s3_key}"

        return file_url

    def decrypt(self, b64_text):
        # Decode the Base64 string back to bytes, then to text
        return base64.b64decode(b64_text.encode()).decode()

    def retrieve(self, request, pk=None):
        """Get details of a specific seller listing by listing_id"""
        try:
            listing = SellerListing.objects.get(listing_id=pk)
        except SellerListing.DoesNotExist:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "Listing not found."
            }, status=status.HTTP_404_NOT_FOUND)

        serializer = SellerListingSerializer(listing)
        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": serializer.data,
            "error": None
        })
    
    def update(self, request, pk=None):
        """Update a specific seller listing by listing_id"""
        # Step 1: Get user_id from request data
        user_id = request.data.get('user_id')
        if not user_id:
            return Response({
                "success": False,
                "user_not_logged_in": True,
                "user_unauthorized": False,
                "data": None,
                "error": "User ID is required in request data."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Step 2: Check if listing exists
        try:
            listing = SellerListing.objects.get(listing_id=pk)
        except SellerListing.DoesNotExist:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "Listing not found."
            }, status=status.HTTP_404_NOT_FOUND)

        # Step 3: Check if the logged-in user is the owner of the listing
        if listing.seller_user_id != user_id:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": True,
                "data": None,
                "error": "You don't have permission to edit this listing. Only the original author can modify their listings."
            }, status=status.HTTP_403_FORBIDDEN)

        # Step 4: Validate user exists and is a seller
        try:
            from UserDetail.models import User
            seller = User.objects.get(
                user_id=user_id,
                role__in=['seller_individual', 'seller_corporate'],
                is_deleted=False
            )
        except User.DoesNotExist:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": f"Seller not found with ID: {user_id}"
            }, status=status.HTTP_404_NOT_FOUND)

        # # Step 5: Check if listing can be updated (status validation)
        # if listing.status not in ['pending', 'rejected']:
        #     return Response({
        #         "success": False,
        #         "user_not_logged_in": False,
        #         "user_unauthorized": False,
        #         "data": None,
        #         "error": f"Cannot update {listing.status} listings. Only pending or rejected listings can be updated."
        #     }, status=status.HTTP_400_BAD_REQUEST)

        # Step 6: Update the listing with basic fields first
        serializer = SellerListingSerializer(listing, data=request.data, partial=True)
        if serializer.is_valid():
            # Reset status to pending if it was rejected
            if listing.status == 'rejected':
                listing.status = 'pending'
            
            listing.updated_at = timezone.now()
            serializer.save()
            
            # Handle image uploads after basic data is saved
            uploaded_images = []
            
            
            # Handle featured image update
            featured_image = request.FILES.get('featured_image')
            if featured_image:
               
                try:
                    featured_image_url = self.upload_file_to_s3(featured_image)
                   
                    listing.featured_image_url = featured_image_url
                    uploaded_images.append({"type": "featured", "url": featured_image_url})
                except Exception as e:
                    print(f"❌ [DEBUG] Failed to upload featured image: {str(e)}")
            else:
                print(f"🔍 [DEBUG] No new featured image in request")
            
            # Handle removed featured image
            if request.data.get('remove_featured_image') == 'true':
                print(f"🔍 [DEBUG] Removing existing featured image")
                listing.featured_image_url = None
                print(f"🔍 [DEBUG] Set featured_image_url to None")
            
            # Handle gallery images update (up to 5)
            # Get existing gallery images
            existing_gallery_images = listing.gallery_images or []
            
            # Handle removed gallery images
            removed_gallery_images = request.data.get('remove_gallery_images')
            if removed_gallery_images:
                try:
                    removed_urls = json.loads(removed_gallery_images)
                    # Remove the specified URLs from existing gallery images
                    existing_gallery_images = [url for url in existing_gallery_images if url not in removed_urls]
                except (json.JSONDecodeError, TypeError):
                    print("Failed to parse removed gallery images")
            
            # Add new gallery images
            new_gallery_urls = []
            for i in range(1, 6):  # gallery_image_1 to gallery_image_5
                gallery_image = request.FILES.get(f'gallery_image_{i}')
                if gallery_image:
                    try:
                        gallery_image_url = self.upload_file_to_s3(gallery_image)
                        new_gallery_urls.append(gallery_image_url)
                        uploaded_images.append({"type": f"gallery_{i}", "url": gallery_image_url})
                    except Exception as e:
                        print(f"Failed to upload gallery image {i}: {str(e)}")
            
            # Combine existing and new gallery images (maintain order: existing first, then new)
            updated_gallery_images = existing_gallery_images + new_gallery_urls
            
            # Ensure we don't exceed the maximum of 5 gallery images
            if len(updated_gallery_images) > 5:
                updated_gallery_images = updated_gallery_images[:5]
            
            # Update gallery images
            listing.gallery_images = updated_gallery_images if updated_gallery_images else None
            
            # Save the listing with updated image URLs
            print(f"🔍 [DEBUG] Before save - featured_image_url: {listing.featured_image_url}")
            print(f"🔍 [DEBUG] Before save - gallery_images: {listing.gallery_images}")
            listing.save()
            print(f"🔍 [DEBUG] After save - listing saved successfully")
            
            # Serialize the updated listing for response
            response_serializer = SellerListingSerializer(listing)
            
            return Response({
                "success": True,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": response_serializer.data,
                "error": None,
                "meta": {
                    "message": "Listing updated successfully by owner.",
                    "listing_id": listing.listing_id,
                    "seller_id": user_id,
                    "status": listing.status,
                    "uploaded_images": uploaded_images,
                    "total_images": len(uploaded_images)
                }
            })
        return Response({
            "success": False,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": None,
            "error": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


class AdminListingViewSet(viewsets.ViewSet):
    
    @handle_exceptions
    # @check_authentication(required_role='admin')
    def list(self, request):
        """Get all listings with optional status filter - supports multiple statuses"""
        status_filter = request.query_params.get('status')
        if status_filter == 'approved':
            listings = SellerListing.objects.filter(status='approved').order_by('-created_at')
        elif status_filter == 'pending':
            listings = SellerListing.objects.filter(status='pending').order_by('-created_at')
        elif status_filter == 'rejected':
            listings = SellerListing.objects.filter(status='rejected').order_by('-created_at')  
        else:
            listings = SellerListing.objects.all().order_by('-created_at')

        # if status_filter:
        #     # Split comma-separated statuses and filter
        #     status_list = [status.strip() for status in status_filter.split(',')]
        #     listings = listings.filter(status__in=status_list)
        
        serializer = SellerListingSerializer(listings, many=True)
        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": serializer.data,
            "error": None
        })

class AdminListingApprovalViewSet(viewsets.ViewSet):
    @handle_exceptions
    # @check_authentication(required_role='admin')
    def partial_update(self, request, pk=None):
        """Approve a pending listing"""
        try:
            listing = SellerListing.objects.get(listing_id=pk, status='pending')
        except SellerListing.DoesNotExist:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "Pending listing not found."
            }, status=status.HTTP_404_NOT_FOUND)

        listing.status = 'approved'
        listing.approved_at = timezone.now()
        listing.revival_time = timezone.now()  # Set revival time to current time
        # listing.approved_by = request.user.user_id
        listing.save()

        serializer = SellerListingSerializer(listing)
        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": serializer.data,
            "error": None
        })


class AdminListingrejectionViewSet(viewsets.ViewSet):
    @handle_exceptions
    # @check_authentication(required_role='admin')
    # @action(detail=True, methods=['patch'])
    def partial_update(self, request, pk=None):
        """Reject a pending listing"""
        try:
            listing = SellerListing.objects.get(listing_id=pk, status='pending')
        except SellerListing.DoesNotExist:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "Pending listing not found."
            }, status=status.HTTP_404_NOT_FOUND)

        rejection_reason = request.data.get('rejection_reason', '')
        
        listing.status = 'rejected'
        listing.rejection_reason = rejection_reason
        listing.rejected_at = timezone.now()
        # listing.rejected_by = request.user.user_id
        listing.save()

        serializer = SellerListingSerializer(listing)
        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": serializer.data,
            "error": None
        })

    
class AllListingsViewset(viewsets.ViewSet):
    @handle_exceptions
    # @check_authentication(required_role='buyer_corporate')  # Adjust if needed
    def list(self, request):
        """Get approved listings with optional filtering and sorting"""
        # Start with approved listings only
        listings = SellerListing.objects.filter(status='approved')
        
        # Get filter parameters from request body or query params
        filters = request.query_params
        
        # Apply filters if provided
        if filters.get('category_id'):
            listings = listings.filter(category_id=filters['category_id'])
       
        if filters.get('subcategory_id'):
            listings = listings.filter(subcategory_id=filters['subcategory_id'])
            
        if filters.get('search'):
            search_term = filters['search']
            listings = listings.filter(
                Q(description__icontains=search_term) |
                Q(city_location__icontains=search_term) |
                Q(state_location__icontains=search_term) |
                Q(address__icontains=search_term)
            )
            
        if filters.get('city_location'):
            listings = listings.filter(city_location__icontains=filters['city_location'])
            
        if filters.get('state_location'):
            listings = listings.filter(state_location__icontains=filters['state_location'])
            
       
        # Quantity range filtering
        if filters.get('min_quantity'):
            listings = listings.filter(quantity__gte=filters['min_quantity'])
            
        if filters.get('max_quantity'):
            listings = listings.filter(quantity__lte=filters['max_quantity'])
            
        if filters.get('unit'):
            listings = listings.filter(unit__icontains=filters['unit'])
        
        # Price range filtering
        if filters.get('min_price'):
            try:
                min_price = float(filters['min_price'])
                listings = listings.filter(priceperunit__gte=min_price)
            except (ValueError, TypeError):
                pass  # Ignore invalid price values
            
        if filters.get('max_price'):
            try:
                max_price = float(filters['max_price'])
                listings = listings.filter(priceperunit__lte=max_price)
            except (ValueError, TypeError):
                pass  # Ignore invalid price values
        
        # Sorting options
        sort_by = filters.get('sort_by', 'approved_at')  # Default sort by approved_at
        sort_order = filters.get('sort_order', 'desc')  # Default descending order
        
        # Available sorting fields
        valid_sort_fields = {
            'approved_at': 'auto_approved_at',  # Using auto_approved_at as proxy for approved_at
            'quantity': 'quantity',
            'priceperunit': 'priceperunit',
            'unit': 'unit',
            'city_location': 'city_location',
            'state_location': 'state_location',
            'revived_at': 'revived_at',
        }
        
        # Apply sorting
        if sort_by in valid_sort_fields:
            sort_field = valid_sort_fields[sort_by]
            if sort_order.lower() == 'asc':
                listings = listings.order_by(sort_field)
            else:  # Default to desc
                listings = listings.order_by(f'-{sort_field}')
        else:
            # Default sorting by auto_approved_at (newest first)
            listings = listings.order_by('-auto_approved_at')
        
        serializer = SellerListingSerializer(listings, many=True)
        
        # Add debugging information
        total_approved_listings = SellerListing.objects.filter(status='approved').count()
        filtered_count = listings.count()
        
        # Create applied filters summary for debugging
        applied_filters = {}
        if filters.get('category_id'):
            applied_filters['category_id'] = filters['category_id']
        if filters.get('subcategory_id'):
            applied_filters['subcategory_id'] = filters['subcategory_id']
        if filters.get('search'):
            applied_filters['search'] = filters['search']
        if filters.get('city_location'):
            applied_filters['city_location'] = filters['city_location']
        if filters.get('state_location'):
            applied_filters['state_location'] = filters['state_location']
        if filters.get('min_quantity'):
            applied_filters['min_quantity'] = filters['min_quantity']
        if filters.get('max_quantity'):
            applied_filters['max_quantity'] = filters['max_quantity']
        if filters.get('unit'):
            applied_filters['unit'] = filters['unit']
        if filters.get('min_price'):
            applied_filters['min_price'] = filters['min_price']
        if filters.get('max_price'):
            applied_filters['max_price'] = filters['max_price']
        if filters.get('sort_by'):
            applied_filters['sort_by'] = filters['sort_by']
        if filters.get('sort_order'):
            applied_filters['sort_order'] = filters['sort_order']
        
        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": serializer.data,
            "debug_info": {
                "total_approved_listings": total_approved_listings,
                "filtered_count": filtered_count,
                "applied_filters": applied_filters,
                "available_sort_fields": list(valid_sort_fields.keys())
            },
            "error": None
        })

    @handle_exceptions
    def retrieve(self, request, pk=None):
        """Get detailed information for a specific listing"""
        try:
            listing = SellerListing.objects.get(
                listing_id=pk,
                status='approved'  # Only allow viewing approved listings
            )
        except SellerListing.DoesNotExist:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "Listing not found or not available."
            }, status=status.HTTP_404_NOT_FOUND)

        serializer = SellerListingSerializer(listing)
        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": serializer.data,
            "error": None
        })
    

class BuyerRequirementsViewset(viewsets.ViewSet):

    @handle_exceptions
    # @check_authentication(required_role='buyer_corporate') 
    def list(self, request):
        """Get all listings for the authenticated buyer"""
        requirements = BuyerRequirement.objects.filter(
            buyer_user_id=request.user.user_id
            # buyer_user_id="BI8952706973"  # Replace with actual buyer ID
        ).exclude(status='deleted').order_by('-created_at')
        
        serializer = BuyerRequirementSerializer(requirements, many=True)
        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": serializer.data,
            "error": None
        })

    @handle_exceptions
    # @check_authentication(required_role='buyer_corporate')
    def retrieve(self, request, pk=None):
        """Get all requirements for a specific buyer user_id"""
        user_id = pk
        
        if not user_id:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "User ID is required."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate user_id exists and is a buyer
        try:
            from UserDetail.models import User
            buyer = User.objects.get(
                user_id=user_id,
                role__in=['buyer_individual', 'buyer_corporate'],
                is_deleted=False
            )
        except User.DoesNotExist:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": f"Buyer not found with ID: {user_id}"
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Get all requirements for this buyer
        requirements = BuyerRequirement.objects.filter(
            buyer_user_id=user_id
        ).exclude(status='deleted').order_by('-created_at')
        
        serializer = BuyerRequirementSerializer(requirements, many=True)
        
        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": serializer.data,
            "error": None,
            
        })
    
    @handle_exceptions
    # @check_authentication(required_role='buyer_corporate')
    def create(self, request):
        """Create a new buyer requirement listing with user_id from request data"""
        data = request.data

        # Get user_id from request data
        user_id = data.get('user_id')
        if not user_id:
            return Response({
                "success": False,
                "user_not_logged_in": True,
                "user_unauthorized": False,
                "data": None,
                "error": "User ID is required in request data."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validate user_id exists and is a buyer
        try:
            from UserDetail.models import User, Wallet
            buyer = User.objects.get(
                user_id=user_id,
                role__in=['buyer_individual', 'buyer_corporate'],
                is_deleted=False
            )
        except User.DoesNotExist:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": f"Buyer not found with ID: {user_id}"
            }, status=status.HTTP_404_NOT_FOUND)

        # Check and deduct credits from wallet
        try:
            wallet = Wallet.objects.get(user_id=user_id)
            
            # Reset free credits if due
            wallet.reset_free_credits_if_due()
            
            # Check if user has sufficient credits (more than 1)
            total_credits = wallet.free_credits + wallet.paid_credits
            if total_credits <= 1:
                return Response({
                    "success": False,
                    "user_not_logged_in": False,
                    "user_unauthorized": False,
                    "data": None,
                    "error": f"Insufficient credits. You need more than 1 credit to post a requirement. Current credits: {total_credits}"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Deduct 1 credit (prioritize free credits first)
            if wallet.free_credits > 0:
                wallet.free_credits -= 1
            else:
                wallet.paid_credits -= 1
            
            wallet.save()
            
        except Wallet.DoesNotExist:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "Wallet not found for this user. Please contact support."
            }, status=status.HTTP_404_NOT_FOUND)

        required_fields = ['category_id', 'subcategory_id', 'quantity', 'unit', 'city_location', 'state_location', 'pincode_location', 'address']
        for field in required_fields:
            if not data.get(field):
                return Response({
                    "success": False,
                    "user_not_logged_in": False,
                    "user_unauthorized": False,
                    "data": None,
                    "error": f"{field} is required."
                }, status=status.HTTP_400_BAD_REQUEST)

        # Validate category_id and subcategory_id exist
        try:
            category = Category.objects.get(category_id=data['category_id'])
        except Category.DoesNotExist:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": f"Category with ID {data['category_id']} does not exist."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            subcategory = SubCategory.objects.get(sub_category_id=data['subcategory_id'])
        except SubCategory.DoesNotExist:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": f"Subcategory with ID {data['subcategory_id']} does not exist."
            }, status=status.HTTP_400_BAD_REQUEST)

        requirement = BuyerRequirement.objects.create(
            buyer_user_id=user_id,
            category_id=data['category_id'],
            subcategory_id=data['subcategory_id'],
            quantity=data['quantity'],
            unit=data['unit'],
            description=data.get('description', ''),
            city_location=data['city_location'],
            state_location=data['state_location'],
            pincode_location=data['pincode_location'],
            address=data['address'],
            status='active'
        )

        # Set revived_at and valid_until similar to SellerListing
        requirement.revived_at = timezone.now()
        requirement.valid_until = requirement.revived_at + timezone.timedelta(days=7)
        requirement.save()

        serializer = BuyerRequirementSerializer(requirement)
        
        # Get updated wallet info for response
        wallet.refresh_from_db()
        
        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": serializer.data,
            "error": None,
            "meta": {
                "buyer_id": user_id,
                "buyer_role": buyer.role,
                "requirement_id": requirement.requirement_id,
                "status": requirement.status,
                "valid_until": requirement.valid_until,
                "credits_deducted": 1,
                "remaining_credits": {
                    "free_credits": wallet.free_credits,
                    "paid_credits": wallet.paid_credits,
                    "total_credits": wallet.free_credits + wallet.paid_credits
                }
            }
        }, status=status.HTTP_201_CREATED)

    @handle_exceptions
    # @check_authentication(required_role='buyer_corporate')
    def update(self, request, pk=None):
        """Update an existing buyer requirement listing"""
        
        # Step 1: Check if requirement exists at all
        try:
            requirement_exists = BuyerRequirement.objects.get(requirement_id=pk)
        except BuyerRequirement.DoesNotExist:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "Requirement not found."
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Step 2: Check if current user owns this requirement
        if requirement_exists.buyer_user_id != "BI8952706973":  # Replace with actual buyer ID
            # if requirement_exists.buyer_user_id != request.user.user_id:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": True,
                "data": None,
                "error": "You don't have permission to edit this requirement. Only the original author can modify their requirements."
            }, status=status.HTTP_403_FORBIDDEN)
        
        requirement = requirement_exists
        
        # Step 3: Check if requirement can be updated
        if requirement.status in ['requirementfulfilled', 'deleted']:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": f"Cannot update {requirement.status} requirements. Only active or inactive requirements can be updated."
            }, status=status.HTTP_400_BAD_REQUEST)

        # Step 4: Validate and update fields
        data = request.data
        if not data:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "No data provided for update."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        updatable_fields = ['category', 'subcategory', 'quantity', 'unit', 'description', 
                           'city_location', 'state_location', 'pincode_location', 'address']
        
        updated_fields = []
        for field in updatable_fields:
            if field in data:
                setattr(requirement, field, data[field])
                updated_fields.append(field)
        
        if not updated_fields:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "No valid fields provided for update."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Step 5: Reset status to active if it was inactive and update revival time
        if requirement.status == 'inactive':
            requirement.status = 'active'
            requirement.revived_at = timezone.now()
            requirement.valid_until = requirement.revived_at + timezone.timedelta(days=7)
            updated_fields.append('status')
        
        requirement.save()

        serializer = BuyerRequirementSerializer(requirement)
        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": {
                "requirement": serializer.data,
                # "updated_fields": updated_fields,
                "message": "Requirement updated successfully by author."
            },
            "error": None
        })

    @handle_exceptions
    # @check_authentication(required_role='buyer_corporate')
    def partial_update(self, request, pk=None):
        """Mark a requirement as fulfilled"""
        try:
            requirement = BuyerRequirement.objects.get(
                requirement_id=pk, 
                buyer_user_id="BI8952706973",
                status='active'
            )
        except BuyerRequirement.DoesNotExist:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "Active requirement not found or cannot be marked as fulfilled."
            }, status=status.HTTP_404_NOT_FOUND)

        requirement.status = 'requirementfulfilled'
        requirement.save()

        serializer = BuyerRequirementSerializer(requirement)
        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": {
                "requirement": serializer.data,
                "message": "Requirement marked as fulfilled successfully."
            },
            "error": None
        })
    



    # @handle_exceptions
    # # @check_authentication(required_role='buyer_corporate')
    # @action(detail=True, methods=['patch'])
    # def revive_requirement(self, request, pk=None):
    #     """Revive an inactive requirement"""
    #     try:
    #         requirement = BuyerRequirement.objects.get(
    #             requirement_id=pk, 
    #             buyer_user_id="BC5294468983",
    #             status='inactive'
    #         )
    #     except BuyerRequirement.DoesNotExist:
    #         return Response({
    #             "success": False,
    #             "user_not_logged_in": False,
    #             "user_unauthorized": False,
    #             "data": None,
    #             "error": "Inactive requirement not found or cannot be revived."
    #         }, status=status.HTTP_404_NOT_FOUND)

    #     requirement.status = 'active'
    #     requirement.revived_at = timezone.now()
    #     requirement.valid_until = requirement.revived_at + timezone.timedelta(days=7)
    #     requirement.save()

    #     serializer = BuyerRequirementSerializer(requirement)
    #     return Response({
    #         "success": True,
    #         "user_not_logged_in": False,
    #         "user_unauthorized": False,
    #         "data": {
    #             "requirement": serializer.data,
    #             "message": "Requirement revived successfully."
    #         },
    #         "error": None
    #     })

class AdminBuyerRequirementsViewSet(viewsets.ViewSet):
    
    @handle_exceptions
    # @check_authentication(required_role='admin')
    def list(self, request):
        """Get all buyer requirements with optional status filter"""
        status_filter = request.query_params.get('status')
        if status_filter == 'active':
            requirements = BuyerRequirement.objects.filter(status='active').order_by('-created_at')
        elif status_filter == 'inactive':
            requirements = BuyerRequirement.objects.filter(status='inactive').order_by('-created_at')
        elif status_filter == 'requirementfulfilled':
            requirements = BuyerRequirement.objects.filter(status='requirementfulfilled').order_by('-created_at')
        elif status_filter == 'deleted':
            requirements = BuyerRequirement.objects.filter(status='deleted').order_by('-created_at')
        else:
            requirements = BuyerRequirement.objects.all().order_by('-created_at')

        serializer = BuyerRequirementSerializer(requirements, many=True)
        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": serializer.data,
            "error": None
        })


class AllBuyerRequirementsViewset(viewsets.ViewSet):
    @handle_exceptions
    def list(self, request):
        """Get active buyer requirements with optional filtering and sorting"""
        # Start with active requirements only
        requirements = BuyerRequirement.objects.filter(status='active')
        
        # Get filter parameters from request body or query params
        filters = request.query_params
        
        # Apply filters if provided
        if filters.get('category_id'):
            requirements = requirements.filter(category_id=filters['category_id'])
        elif filters.get('category'):
            # Support filtering by category name for backward compatibility
            try:
                category = Category.objects.get(title__icontains=filters['category'])
                requirements = requirements.filter(category_id=category.category_id)
            except Category.DoesNotExist:
                requirements = requirements.none()  # Return empty queryset if category not found
            
        if filters.get('subcategory_id'):
            requirements = requirements.filter(subcategory_id=filters['subcategory_id'])
        elif filters.get('subcategory'):
            # Support filtering by subcategory name for backward compatibility
            try:
                subcategory = SubCategory.objects.get(title__icontains=filters['subcategory'])
                requirements = requirements.filter(subcategory_id=subcategory.sub_category_id)
            except SubCategory.DoesNotExist:
                requirements = requirements.none()  # Return empty queryset if subcategory not found
            
        if filters.get('city_location'):
            requirements = requirements.filter(city_location__icontains=filters['city_location'])
            
        if filters.get('state_location'):
            requirements = requirements.filter(state_location__icontains=filters['state_location'])
            
        # Quantity range filtering
        if filters.get('min_quantity'):
            requirements = requirements.filter(quantity__gte=filters['min_quantity'])
            
        if filters.get('max_quantity'):
            requirements = requirements.filter(quantity__lte=filters['max_quantity'])
            
        if filters.get('unit'):
            requirements = requirements.filter(unit__icontains=filters['unit'])
        
        # Sorting options
        sort_by = filters.get('sort_by', 'created_at')  # Default sort by created_at
        sort_order = filters.get('sort_order', 'desc')  # Default descending order
        
        # Available sorting fields
        valid_sort_fields = {
            'created_at': 'created_at',
            'quantity': 'quantity',
            'unit': 'unit',
            'city_location': 'city_location',
            'state_location': 'state_location',
            'revived_at': 'revived_at',
        }
        
        # Apply sorting
        if sort_by in valid_sort_fields:
            sort_field = valid_sort_fields[sort_by]
            if sort_order.lower() == 'asc':
                requirements = requirements.order_by(sort_field)
            else:  # Default to desc
                requirements = requirements.order_by(f'-{sort_field}')
        else:
            # Default sorting by created_at (newest first)
            requirements = requirements.order_by('-created_at')
        
        serializer = BuyerRequirementSerializer(requirements, many=True)
        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": serializer.data,
            "error": None
        })


class CategoriesViewSet(viewsets.ViewSet):
    """ViewSet for managing categories and subcategories"""
    
    @handle_exceptions
    def list(self, request):
        """Get all categories"""
        categories = Category.objects.filter(is_active=True).order_by('title')
        serializer = CategorySerializer(categories, many=True)
        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": serializer.data,
            "error": None
        })
    
    @handle_exceptions
    @action(detail=False, methods=['get'])
    def with_subcategories(self, request):
        """Get all categories with their subcategories in one call"""
        categories = Category.objects.filter(is_active=True).order_by('title')
        
        result = []
        for category in categories:
            subcategories = SubCategory.objects.filter(
                category_id=category.category_id, 
                is_active=True
            ).order_by('title')
            
            category_data = CategorySerializer(category).data
            category_data['subcategories'] = SubCategorySerializer(subcategories, many=True).data
            result.append(category_data)
        
        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": result,
            "error": None
        })
    
    @handle_exceptions
    def retrieve(self, request, pk=None):
        """Get subcategories for a specific category"""
        try:
            category = Category.objects.get(category_id=pk, is_active=True)
        except Category.DoesNotExist:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "Category not found."
            }, status=status.HTTP_404_NOT_FOUND)
        
        subcategories = SubCategory.objects.filter(
            category_id=category.category_id, 
            is_active=True
        ).order_by('title')
        
        serializer = SubCategorySerializer(subcategories, many=True)
        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": {
                "category": CategorySerializer(category).data,
                "subcategories": serializer.data
            },
            "error": None
        })