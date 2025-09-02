from rest_framework import viewsets, status
from rest_framework.response import Response

from django.utils import timezone

from .models import *
from .serializers import *
from .utils import generate_send_otp


from utils.decorators import handle_exceptions, check_authentication

from datetime import timedelta


class OtpAuthViewSet(viewsets.ViewSet):

    @handle_exceptions
    def create(self, request):
        """
        API 1: Generate OTP
        """
        mobile = request.data.get("mobile")
        if not mobile:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "Mobile number is required."
            }, status=status.HTTP_400_BAD_REQUEST)

        otp = generate_send_otp(contact_number=mobile)
        otp_obj = OTPVerification.objects.create(
            mobile=mobile,
            otp=otp,
            expires_at=timezone.now() + timedelta(minutes=5),
            is_verified=False,
            attempt_count=0
        )

        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": {"otp_id": otp_obj.id, "otp": otp},  # remove otp in production
            "error": None
        }, status=status.HTTP_201_CREATED)

    @handle_exceptions
    def update(self, request, pk):
        """
        API 2: Verify OTP & Login/Register
        """

        otp_id = pk
        otp = request.data.get("otp")
        user_type = request.data.get("user_type")  # buyer_individual or buyer_corporate

        if not otp_id or not otp or not user_type:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "otp_id, otp, and user_type are required."
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            otp_obj = OTPVerification.objects.get(id=otp_id)
        except OTPVerification.DoesNotExist:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "Invalid OTP ID."
            }, status=status.HTTP_404_NOT_FOUND)

        if otp_obj.is_verified:
            return Response({
                "success": True,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": {"otp_verified": False, "message": "OTP already used."},
                "error": None
            }, status=status.HTTP_200_OK)

        if otp_obj.expires_at < timezone.now():
            return Response({
                "success": True,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": {"otp_verified": False, "message": "OTP expired."},
                "error": None
            }, status=status.HTTP_200_OK)

        if otp_obj.attempt_count >= 2:
            return Response({
                "success": True,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": {"otp_verified": False, "message": "Maximum attempts reached."},
                "error": None
            }, status=status.HTTP_200_OK)

        if otp_obj.otp != otp:
            otp_obj.attempt_count += 1
            otp_obj.save()
            return Response({
                "success": True,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": {"otp_verified": False, "message": "Incorrect OTP."},
                "error": None
            }, status=status.HTTP_200_OK)

        # OTP is correct
        otp_obj.is_verified = True
        otp_obj.save()

        user = User.objects.filter(contact_number=otp_obj.mobile, is_deleted=False).first()

        if user:
            user_details_filled = bool(user.name)
        else:
            user = User.objects.create(
                contact_number=otp_obj.mobile,
                role=user_type,
                email=None,
            )
            # Create wallet for buyer users
            if user_type in ['buyer_individual', 'buyer_corporate']:
                initial_credits = 5 if user_type == 'buyer_individual' else 3
                Wallet.objects.create(
                    user_id=user.user_id,
                    role=user_type,
                    free_credits=initial_credits,
                    paid_credits=0,
                )
            user_details_filled = False       
        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": {
                "otp_verified": True,
                "user_id": user.user_id,
                "user_details": user_details_filled,
                "user_role": user.role
            },
            "error": None
        }, status=status.HTTP_200_OK)


class UserDetailViewSet(viewsets.ViewSet):

    @handle_exceptions
    # @check_authentication(required_role=['buyer_individual', 'buyer_corporate'])
    def update(self, request, pk):
        """
        API 3: Fill User Details after OTP verification
        """
        # user = request.user
        user_id = pk
        user = User.objects.get(user_id=user_id)
        role = user.role

        # Prepare update payload; normalize empty strings to None for optional IDs
        incoming = request.data
        update_data = {}
        for key in ['name', 'email', 'pan_number', 'aadhar_number', 'addressline1', 'addressline2', 'city', 'state', 'address_pincode']:
            if key in incoming:
                val = incoming.get(key)
                if isinstance(val, str):
                    val = val.strip()
                # Normalize empty strings to None for optional fields
                if key in ['pan_number', 'aadhar_number'] and (val == '' or val is None):
                    val = None
                update_data[key] = val

        serializer = UserSerializer(user, data=update_data, partial=True)
        if serializer.is_valid():
            serializer.save()

            # Handle corporate user detail creation
            if role in ['buyer_corporate', 'seller_corporate']:
                company_name = request.data.get("company_name")
                pan_number = request.data.get("pan_number")
                cin_number = request.data.get("cin_number")
                aadhar_number = request.data.get("aadhar_number")
                gst_number = request.data.get("gst_number")
                addressline1 = request.data.get("addressline1")
                addressline2 = request.data.get("addressline2")
                address_pincode = request.data.get("address_pincode")
                city = request.data.get("city")
                state = request.data.get("state")
                certificate_url = request.data.get("certificate_url")
                name = request.data.get('name')
                contact_number = user.contact_number
                email = request.data.get('email')

                is_approved = False
                


                # Save corporate details
                CorporateUserDetail.objects.update_or_create(
                    user_id=user.user_id,
                    defaults={
                        "name": name,
                        "contact_number": contact_number,
                        "email": email,
                        "company_name": company_name,
                        "pan_number": pan_number,
                        "cin_number": cin_number,
                        "aadhar_number": aadhar_number,
                        "gst_number": gst_number,
                        "city": city,
                        "state": state,
                        "addressline1": addressline1,
                        "addressline2": addressline2,
                        "address_pincode": address_pincode,
                        "certificate_url": certificate_url,
                        "requested_at": timezone.now(),
                        "is_approved": is_approved,
                        "approved_at": timezone.now(),
                        "is_deleted": False,
                        "rejection_reason": None,
                    }
                )

                # Corporate users are inactive until approved
                user.is_active = False
                user.save()
            else:
                # Individual users: ensure PAN/Aadhar are updated based on provided data
                # At least one may be provided depending on UI selection; treat missing/empty as None
                pan_number = update_data.get('pan_number', None)
                aadhar_number = update_data.get('aadhar_number', None)
                fields_changed = []
                name = request.data.get('name', user.name)
                email = request.data.get('email', user.email)

                fields_changed.append('name')
                fields_changed.append('email')

                if 'pan_number' in update_data:
                    user.pan_number = pan_number
                    fields_changed.append('pan_number')
                if 'aadhar_number' in update_data:
                    user.aadhar_number = aadhar_number
                    fields_changed.append('aadhar_number')

                if fields_changed:
                    user.save(update_fields=fields_changed)

            return Response({
                "success": True,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": serializer.data,
                "error": None
            }, status=status.HTTP_200_OK)

        return Response({
            "success": False,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": None,
            "error": serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


class CorporateBuyerViewSet(viewsets.ViewSet):
    """Approve / Reject corporate buyer API"""
    @handle_exceptions
    @check_authentication(required_role='admin')
    def list(self, request):
        unapproved_corporate_profiles_obj = CorporateUserDetail.objects.filter(is_approved=False, is_deleted=False, is_rejected=False)
        unapproved_corporate_profiles = CorporateUserDetailSerializer(unapproved_corporate_profiles_obj, many=True).data

        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": unapproved_corporate_profiles,
            "error": None
        }, status=status.HTTP_200_OK)

    @handle_exceptions
    @check_authentication(required_role='admin')
    def update(self, request, pk):
        user_id = pk

        corporate_buyer_obj = CorporateUserDetail.objects.get(user_id=user_id, is_deleted=False)
        if not corporate_buyer_obj:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "Corporate Buyer with this id doesnot exists."
            }, status=status.HTTP_200_OK)
        
        is_approved = request.data.get('is_approved')
        reason = request.data.get('reason')

        if is_approved is True:
            corporate_buyer_obj.is_rejected = False
            corporate_buyer_obj.is_approved = True
            corporate_buyer_obj.approved_at = timezone.now()
            corporate_buyer_obj.save()

            return Response({
                "success": True,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": "Approved.",
                "error": None
            }, status=status.HTTP_200_OK)
        
        else:
            corporate_buyer_obj.is_approved = False
            corporate_buyer_obj.is_rejected = True
            corporate_buyer_obj.rejected_at = timezone.now()
            corporate_buyer_obj.rejection_reason = reason
            corporate_buyer_obj.save()

            return Response({
                    "success": True,
                    "user_not_logged_in": False,
                    "user_unauthorized": False,
                    "data": "UnApproved due to mentioned reason.",
                    "error": None
                }, status=status.HTTP_200_OK)


class AccountCreationViewSet(viewsets.ViewSet):
    
    @handle_exceptions
    # @check_authentication(required_role='admin')
    def create(self, request):
            name = request.data.get('name')
            password = request.data.get('password')
            contact_number = request.data.get('contact_number')
            email = request.data.get('email')
            role = request.data.get('role')            

            USER_ROLES = [
                'admin',
                'buyer_individual',
                'buyer_corporate',
                'seller_individual',
                'seller_corporate',
            ]


            email_already_user = User.objects.filter(is_active=True, email=email).exists()
            contact_number_already_user = User.objects.filter(is_active=True, contact_number=contact_number).exists()

            if email_already_user or contact_number_already_user:
                return Response(
                        {
                            "success": False,                            
                            "user_not_logged_in": False,
                            "user_unauthorized": False,
                            "data":None,
                            "error": "User already registered."
                        }, status=status.HTTP_400_BAD_REQUEST)

            if not name or not contact_number or not email or role not in USER_ROLES:
                return Response(
                        {
                            "success": False,                            
                            "user_not_logged_in": False,
                            "user_unauthorized": False,
                            "data":None,
                            "error": "Missing required fields."
                        }, status=status.HTTP_400_BAD_REQUEST)


            if str(role) == 'admin':
                user = User.objects.create_superuser(
                    username=email,
                    password = password,
                    email=email,
                    name=name,
                    contact_number=contact_number,
                    role=role,
                )
            
            else:
                user = User.objects.create_user(
                    username=email,
                    password = password,
                    email=email,
                    name=name,
                    contact_number=contact_number,
                    role=role,
                    is_approved=True,
                )

            user_detail_serializer = UserSerializer(user)
            user_data = user_detail_serializer.data

            if role in ['buyer_corporate', 'seller_corporate']:
                company_name = request.data.get("company_name")
                pan_number = request.data.get("pan_number")
                gst_number = request.data.get("gst_number")
                addressline1 = request.data.get("addressline1")
                addressline2 = request.data.get("addressline2")
                address_pincode = request.data.get("address_pincode")
                certificate_url = request.data.get("certificate_url")
                is_approved = True 

                if not company_name or not pan_number or not addressline1:
                    return Response({
                        "success": False,
                        "user_not_logged_in": False,
                        "user_unauthorized": False,
                        "data": None,
                        "error": "Corporate fields missing: company_name, pan_number, addressline1 are required."
                    }, status=status.HTTP_400_BAD_REQUEST)

                # Save corporate details
                CorporateUserDetail.objects.update_or_create(
                    user_id=user.user_id,
                    defaults={
                        "name": name,
                        "contact_number": contact_number,
                        "email": email,
                        "company_name": company_name,
                        "pan_number": pan_number,
                        "gst_number": gst_number,
                        "addressline1": addressline1,
                        "addressline2": addressline2,
                        "address_pincode": address_pincode,
                        "certificate_url": certificate_url,
                        "requested_at": timezone.now(),
                        "is_approved": is_approved,
                        "approved_at": timezone.now(),
                        "is_deleted": False,
                        "rejection_reason": None,
                    }
                )

                # Corporate users are inactive until approved
                user.is_active = False
                user.save()

            return Response(
                        {
                            "success": True,  
                            "user_not_logged_in": False,
                            "user_unauthorized": False,                       
                            "data": user_data,
                            "error": None
                        }, status=status.HTTP_201_CREATED)


class BuyerCreditUpdateViewSet(viewsets.ViewSet):
    """API to update buyer credits if reset date has passed"""
    
    @handle_exceptions
    # @check_authentication()
    def list(self, request, pk=None):
        """
        API: List all buyers and reset credits only if current date >= free_credit_reset_date
        """
        current_time = timezone.now()
        current_date = current_time.date()
        
        # Get all buyer users (individual and corporate)
        buyer_users = User.objects.filter(
            role__in=['buyer_individual', 'buyer_corporate'],
            is_deleted=False,
            is_active=True
        )
        
        credits_reset_users = []
        no_wallet_users = []
        
        
        for user in buyer_users:
            # Try to get existing wallet
            try:
                wallet = Wallet.objects.get(user_id=user.user_id)
            except Wallet.DoesNotExist:
                no_wallet_users.append({
                    'user_id': user.user_id,
                    'name': user.name,
                    'role': user.role,
                    'message': 'No wallet found for this user'
                })
                continue
            
            # Check if reset is due (current date >= free_credit_reset_date)
            if current_date >= wallet.free_credit_reset_date.date():
                # Store previous values before reset
                previous_credits = wallet.free_credits
                previous_reset_date = wallet.free_credit_reset_date
                
                # Call the reset method
                reset_success = wallet.reset_free_credits_if_due()
                
                if reset_success:
                    user_data = {
                        'user_id': user.user_id,
                        'name': user.name,
                        'role': user.role,
                        'credits_reset': True,
                        'previous_free_credits': previous_credits,
                        'new_free_credits': wallet.free_credits,
                        'previous_reset_date': previous_reset_date,
                        'new_reset_date': wallet.free_credit_reset_date,
                        'reset_timestamp': wallet.last_free_credit_reset,
                        'paid_credits': wallet.paid_credits,
                        
                    }
                    credits_reset_users.append(user_data)

        response_data = {
            'current_date': current_date,
            'total_buyers_found': len(buyer_users),
            'credits_reset_count': len(credits_reset_users),
            'no_wallet_count': len(no_wallet_users),
            'credits_reset_users': credits_reset_users,
            'no_wallet_users': no_wallet_users,
            'summary': {
                'message': f"Processed {len(buyer_users)} buyer users. Reset credits for {len(credits_reset_users)} users whose reset date was due.",
                'update_timestamp': current_time
            }
        }
        
        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": response_data,
            "error": None
        }, status=status.HTTP_200_OK)


class BuyerDetailViewSet(viewsets.ViewSet):
    """API to get particular buyer details including corporate details if applicable"""
    
    @handle_exceptions
    # @check_authentication()
    def retrieve(self, request, pk=None):
        """
        API: Get buyer details by user_id
        If buyer is corporate, also include corporate details
        """
        user_id = pk
        
        try:
            # Get the buyer user
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
                "error": "Buyer not found with this ID."
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Serialize basic user data
        user_serializer = UserSerializer(buyer)
        response_data = {
            'user_details': user_serializer.data,
            'corporate_details': None,
            'wallet_details': None
        }
        
        # If buyer is corporate, get corporate details
        if buyer.role == 'buyer_corporate':
            try:
                corporate_details = CorporateUserDetail.objects.get(
                    user_id=user_id,
                    is_deleted=False
                )
                corporate_serializer = CorporateUserDetailSerializer(corporate_details)
                response_data['corporate_details'] = corporate_serializer.data
            except CorporateUserDetail.DoesNotExist:
                response_data['corporate_details'] = {
                    'message': 'Corporate details not found for this buyer'
                }
        
        # Get wallet details if exists
        try:
            wallet = Wallet.objects.get(user_id=user_id)
            wallet_serializer = WalletSerializer(wallet)
            response_data['wallet_details'] = wallet_serializer.data
        except Wallet.DoesNotExist:
            response_data['wallet_details'] = {
                'message': 'Wallet not found for this buyer'
            }
        
        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": response_data,
            "error": None
        }, status=status.HTTP_200_OK)
    

class SellerDetailviewSet(viewsets.ViewSet):
    """API to get seller details including corporate details if applicable"""
    
    @handle_exceptions
    # @check_authentication()
    def retrieve(self, request, pk=None):
        """
        API: Get seller details by user_id
        If seller is corporate, also include corporate details
        """
        user_id = pk
        
        try:
            # Get the seller user
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
                "error": "Seller not found with this ID."
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Serialize basic user data
        user_serializer = UserSerializer(seller)
        response_data = {
            'user_details': user_serializer.data,
            'corporate_details': None,
            'wallet_details': None
        }
        
        # If seller is corporate, get corporate details
        if seller.role == 'seller_corporate':
            try:
                corporate_details = CorporateUserDetail.objects.get(
                    user_id=user_id,
                    is_deleted=False
                )
                corporate_serializer = CorporateUserDetailSerializer(corporate_details)
                response_data['corporate_details'] = corporate_serializer.data
            except CorporateUserDetail.DoesNotExist:
                response_data['corporate_details'] = {
                    'message': 'Corporate details not found for this seller'
                }
        
        # Get wallet details if exists
        try:
            wallet = Wallet.objects.get(user_id=user_id)
            wallet_serializer = WalletSerializer(wallet)
            response_data['wallet_details'] = wallet_serializer.data
        except Wallet.DoesNotExist:
            response_data['wallet_details'] = {
                'message': 'Wallet not found for this seller'
            }
        
        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": response_data,
            "error": None
        }, status=status.HTTP_200_OK)


class PreferredCategoryViewSet(viewsets.ViewSet):
    """API to manage user's preferred category selection"""
    
    @handle_exceptions
    # @check_authentication()
    def update(self, request, pk=None):
        """
        API: Update user's preferred category
        Used during registration flow and profile updates
        """
        user_id = pk
        preferred_category = request.data.get('preferred_category')
        
        if not preferred_category:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "preferred_category is required."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(user_id=user_id, is_deleted=False)
        except User.DoesNotExist:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "User not found with this ID."
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Validate that the category exists (import Category from MarketPlace)
        try:
            from MarketPlace.models import Category
            category = Category.objects.get(category_id=preferred_category, is_active=True)
        except Category.DoesNotExist:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": f"Category with ID {preferred_category} does not exist or is not active."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Update user's preferred category
        user.preferred_category = preferred_category
        user.save(update_fields=['preferred_category'])
        
        response_data = {
            'user_id': user.user_id,
            'preferred_category': user.preferred_category,
            'category_name': category.title,
            'updated_at': timezone.now()
        }
        
        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": response_data,
            "error": None
        }, status=status.HTTP_200_OK)
    
    @handle_exceptions
    # @check_authentication()
    def retrieve(self, request, pk=None):
        """
        API: Get user's current preferred category
        """
        user_id = pk
        
        try:
            user = User.objects.get(user_id=user_id, is_deleted=False)
        except User.DoesNotExist:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "User not found with this ID."
            }, status=status.HTTP_404_NOT_FOUND)
        
        response_data = {
            'user_id': user.user_id,
            'preferred_category': user.preferred_category,
            'category_name': None
        }
        
        # Get category name if preferred category is set
        if user.preferred_category:
            try:
                from MarketPlace.models import Category
                category = Category.objects.get(category_id=user.preferred_category, is_active=True)
                response_data['category_name'] = category.title
            except Category.DoesNotExist:
                response_data['category_name'] = 'Category not found'
        
        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": response_data,
            "error": None
        }, status=status.HTTP_200_OK)


class ProfileCompletionViewSet(viewsets.ViewSet):
    """API to get user profile completion status and percentage"""
    
    @handle_exceptions
    # @check_authentication()
    def retrieve(self, request, pk=None):
        """
        API: Get user profile completion details and calculate percentage
        Returns basic user info + profile completion percentage
        """
        user_id = pk
        
        try:
            # Get the user
            user = User.objects.get(
                user_id=user_id,
                is_deleted=False
            )
        except User.DoesNotExist:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "User not found with this ID."
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Calculate profile completion percentage based on user role
        completion_data = self.calculate_profile_completion(user)
        
        # Prepare response data
        response_data = {
            'user_id': user.user_id,
            'username': user.username,
            'name': user.name,
            'user_role': user.role,
            'contact_number': user.contact_number,
            'email': user.email,
            'is_active': user.is_active,
            'is_approved': user.is_approved,
            'profile_completed': completion_data['is_complete'],
            'completion_percentage': completion_data['percentage'],
            'completion_details': completion_data['details'],
            'missing_fields': completion_data['missing_fields']
        }
        
        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": response_data,
            "error": None
        }, status=status.HTTP_200_OK)
    
    def calculate_profile_completion(self, user):
        """
        Calculate profile completion percentage based on user role
        Logic adapted from seller_profile.js calculateProfileCompletion function
        """
        completion_data = {
            'percentage': 0,
            'is_complete': False,
            'details': {},
            'missing_fields': []
        }
        
        if user.role in ['seller_individual', 'seller_corporate']:
            return self.calculate_seller_completion(user, completion_data)
        elif user.role in ['buyer_individual', 'buyer_corporate']:
            return self.calculate_buyer_completion(user, completion_data)
        elif user.role == 'admin':
            return self.calculate_admin_completion(user, completion_data)
        else:
            return completion_data
    
    def calculate_seller_completion(self, user, completion_data):
        """Calculate completion for seller users - exact logic from sellerprofile.js"""
        total_fields = 0
        completed_fields = 0
        missing_fields = []
        
        is_corporate = user.role == 'seller_corporate'
        
        if is_corporate:
            # Corporate seller fields - matching JavaScript logic exactly
            user_fields = ['name', 'email', 'contact_number']
            corporate_fields = ['company_name', 'gst_number', 'addressline1', 'addressline2', 'city', 'state', 'address_pincode']
            
            # Total fields = user fields + corporate fields + 1 for ID field (PAN/CIN)
            total_fields = len(user_fields) + len(corporate_fields) + 1
            
            # Check user fields
            for field in user_fields:
                field_value = getattr(user, field, None)
                if field_value and str(field_value).strip():
                    completed_fields += 1
                else:
                    missing_fields.append(f"user_{field}")
            
            # Check corporate fields
            try:
                corporate_details = CorporateUserDetail.objects.get(
                    user_id=user.user_id,
                    is_deleted=False
                )
                
                for field in corporate_fields:
                    field_value = getattr(corporate_details, field, None)
                    if field_value and str(field_value).strip():
                        completed_fields += 1
                    else:
                        missing_fields.append(f"corporate_{field}")
                
                # Check for PAN or CIN (count as one field - either is acceptable)
                pan_number = getattr(corporate_details, 'pan_number', None)
                cin_number = getattr(corporate_details, 'cin_number', None)
                
                if (pan_number and pan_number.strip()) or (cin_number and cin_number.strip()):
                    completed_fields += 1
                else:
                    missing_fields.append("corporate_id_document")
                    
            except CorporateUserDetail.DoesNotExist:
                # No corporate details found - all corporate fields missing
                missing_fields.extend([f"corporate_{field}" for field in corporate_fields])
                missing_fields.append("corporate_id_document")
        else:
            # Individual seller fields - matching JavaScript logic exactly
            individual_fields = ['name', 'email', 'contact_number', 'addressline1', 'addressline2', 'city', 'state', 'address_pincode']
            
            # Total fields = individual fields + 1 for ID field (PAN/Aadhar)
            total_fields = len(individual_fields) + 1
            
            for field in individual_fields:
                field_value = getattr(user, field, None)
                if field_value and str(field_value).strip():
                    completed_fields += 1
                else:
                    missing_fields.append(field)
            
            # Check for PAN or Aadhar (count as one field - either is acceptable)
            pan_number = getattr(user, 'pan_number', None)
            aadhar_number = getattr(user, 'aadhar_number', None)
            
            if (pan_number and pan_number.strip()) or (aadhar_number and aadhar_number.strip()):
                completed_fields += 1
            else:
                missing_fields.append("id_document")
        
        # Calculate percentage - matching JavaScript logic exactly
        if total_fields > 0:
            percentage = round((completed_fields / total_fields) * 100)
            completion_data['percentage'] = min(percentage, 100)
        else:
            completion_data['percentage'] = 0
            
        completion_data['is_complete'] = completion_data['percentage'] == 100
        completion_data['details'] = {
            'total_fields': total_fields,
            'completed_fields': completed_fields,
            'role_type': user.role,
            'is_corporate': is_corporate
        }
        completion_data['missing_fields'] = missing_fields
        
        return completion_data
    
    def calculate_buyer_completion(self, user, completion_data):
        """Calculate completion for buyer users - similar logic to seller"""
        total_fields = 0
        completed_fields = 0
        missing_fields = []
        
        is_corporate = user.role == 'buyer_corporate'
        
        if is_corporate:
            # Corporate buyer fields
            user_fields = ['name', 'email', 'contact_number']
            corporate_fields = ['company_name', 'gst_number', 'addressline1', 'addressline2', 'city', 'state', 'address_pincode']
            
            total_fields = len(user_fields) + len(corporate_fields) + 1
            
            # Check user fields
            for field in user_fields:
                field_value = getattr(user, field, None)
                if field_value and str(field_value).strip():
                    completed_fields += 1
                else:
                    missing_fields.append(f"user_{field}")
            
            # Check corporate fields
            try:
                corporate_details = CorporateUserDetail.objects.get(
                    user_id=user.user_id,
                    is_deleted=False
                )
                
                for field in corporate_fields:
                    field_value = getattr(corporate_details, field, None)
                    if field_value and str(field_value).strip():
                        completed_fields += 1
                    else:
                        missing_fields.append(f"corporate_{field}")
                
                # Check for PAN or CIN
                pan_number = getattr(corporate_details, 'pan_number', None)
                cin_number = getattr(corporate_details, 'cin_number', None)
                
                if (pan_number and pan_number.strip()) or (cin_number and cin_number.strip()):
                    completed_fields += 1
                else:
                    missing_fields.append("corporate_id_document")
                    
            except CorporateUserDetail.DoesNotExist:
                missing_fields.extend([f"corporate_{field}" for field in corporate_fields])
                missing_fields.append("corporate_id_document")
        else:
            # Individual buyer fields
            individual_fields = ['name', 'email', 'contact_number', 'addressline1', 'addressline2', 'city', 'state', 'address_pincode']
            total_fields = len(individual_fields) + 1
            
            for field in individual_fields:
                field_value = getattr(user, field, None)
                if field_value and str(field_value).strip():
                    completed_fields += 1
                else:
                    missing_fields.append(field)
            
            # Check for PAN or Aadhar
            pan_number = getattr(user, 'pan_number', None)
            aadhar_number = getattr(user, 'aadhar_number', None)
            
            if (pan_number and pan_number.strip()) or (aadhar_number and aadhar_number.strip()):
                completed_fields += 1
            else:
                missing_fields.append("id_document")
        
        # Calculate percentage
        if total_fields > 0:
            percentage = round((completed_fields / total_fields) * 100)
            completion_data['percentage'] = min(percentage, 100)
        else:
            completion_data['percentage'] = 0
            
        completion_data['is_complete'] = completion_data['percentage'] == 100
        completion_data['details'] = {
            'total_fields': total_fields,
            'completed_fields': completed_fields,
            'role_type': user.role,
            'is_corporate': is_corporate
        }
        completion_data['missing_fields'] = missing_fields
        
        return completion_data
    
    def calculate_admin_completion(self, user, completion_data):
        """Calculate completion for admin users"""
        total_fields = 0
        completed_fields = 0
        missing_fields = []
        
        # Admin required fields
        admin_fields = ['name', 'email', 'contact_number']
        total_fields = len(admin_fields)
        
        for field in admin_fields:
            field_value = getattr(user, field, None)
            if field_value and str(field_value).strip():
                completed_fields += 1
            else:
                missing_fields.append(field)
        
        # Calculate percentage
        if total_fields > 0:
            percentage = round((completed_fields / total_fields) * 100)
            completion_data['percentage'] = min(percentage, 100)
        else:
            completion_data['percentage'] = 0
            
        completion_data['is_complete'] = completion_data['percentage'] == 100
        completion_data['details'] = {
            'total_fields': total_fields,
            'completed_fields': completed_fields,
            'role_type': user.role,
            'is_corporate': False
        }
        completion_data['missing_fields'] = missing_fields
        
        return completion_data


class UpdateUserDetailsViewSet(viewsets.ViewSet):
    """Dedicated ViewSet for updating user profile details"""
    
    @handle_exceptions
    # @check_authentication(required_role='seller_corporate')
    def update(self, request, pk):
        """
        API: Update User Profile Details
        Supports updating both basic user info and corporate details
        Used primarily for profile settings updates
        """
        user_id = pk
        
        # Verify user exists and belongs to current authenticated user (if needed)
        try:
            user = User.objects.get(user_id=user_id, is_deleted=False)
        except User.DoesNotExist:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "User not found."
            }, status=status.HTTP_404_NOT_FOUND)

        updated_fields = []
        
        # Update basic user details
        user_fields_to_update = {}
        basic_user_fields = ['name', 'email', 'addressline1', 'addressline2', 'city', 'state', 'address_pincode', 'pan_number', 'aadhar_number']  # Removed contact_number to make phone non-editable

        # Map frontend field names to model field names
        field_mapping = {
            'cityname': 'city',
            'statename': 'state', 
            'addresspincode': 'address_pincode'
        }

        for field in basic_user_fields:
            # Check if field exists in request data directly
            if field in request.data:
                # Allow empty strings for ID fields to clear them
                if field in ['pan_number', 'aadhar_number']:
                    user_fields_to_update[field] = request.data[field] if request.data[field] else None
                    updated_fields.append(field)
                elif request.data[field] is not None:
                    user_fields_to_update[field] = request.data[field]
                    updated_fields.append(field)
        
        # Also check for mapped field names
        for frontend_field, model_field in field_mapping.items():
            if frontend_field in request.data and request.data[frontend_field] is not None:
                user_fields_to_update[model_field] = request.data[frontend_field]
                updated_fields.append(model_field)
        
        # Contact number is now non-editable through this API
        # Removed the contact number validation and update logic

        # Update user basic details if any changes
        if user_fields_to_update:
            user_serializer = UserSerializer(user, data=user_fields_to_update, partial=True)
            if user_serializer.is_valid():
                user_serializer.save()
            else:
                return Response({
                    "success": False,
                    "user_not_logged_in": False,
                    "user_unauthorized": False,
                    "data": None,
                    "error": user_serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)

        # Update corporate details if user is corporate
        corporate_updated = False
        if user.role in ['buyer_corporate', 'seller_corporate']:
            corporate_fields = [
                'company_name', 'contact_number', 'email', 'pan_number', 'aadhar_number', 
                'cin_number', 'gst_number', 'city', 'state', 'addressline1', 
                'addressline2', 'address_pincode', 'certificate_url'
            ]
            corporate_updates = {}
            
            for field in corporate_fields:
                if field in request.data:
                    # Allow empty strings for some fields to clear them
                    if field in ['pan_number', 'aadhar_number', 'cin_number']:
                        corporate_updates[field] = request.data[field] if request.data[field] else None
                        updated_fields.append(f'corporate_{field}')
                    elif request.data[field] is not None:
                        corporate_updates[field] = request.data[field]
                        updated_fields.append(f'corporate_{field}')
            
            if corporate_updates:
                try:
                    corporate_details = CorporateUserDetail.objects.get(
                        user_id=user_id,
                        is_deleted=False
                    )
                    
                    # Update corporate fields
                    for field, value in corporate_updates.items():
                        setattr(corporate_details, field, value)
                    
                    # Sync basic details in corporate table with user table
                    corporate_details.name = user.name
                    corporate_details.email = user.email
                    corporate_details.contact_number = user.contact_number
                    
                    corporate_details.save()
                    corporate_updated = True
                    
                except CorporateUserDetail.DoesNotExist:
                    return Response({
                        "success": False,
                        "user_not_logged_in": False,
                        "user_unauthorized": False,
                        "data": None,
                        "error": "Corporate details not found for this user."
                    }, status=status.HTTP_404_NOT_FOUND)

        # Prepare comprehensive response
        response_data = {
            'user_details': UserSerializer(user).data,
            'corporate_details': None,
            'update_summary': {
                'fields_updated': updated_fields,
                'user_data_updated': bool(user_fields_to_update),
                'corporate_data_updated': corporate_updated,
                'total_updates': len(updated_fields)
            }
        }

        # Include corporate details in response if user is corporate
        if user.role in ['buyer_corporate', 'seller_corporate']:
            try:
                corporate_details = CorporateUserDetail.objects.get(
                    user_id=user_id,
                    is_deleted=False
                )
                response_data['corporate_details'] = CorporateUserDetailSerializer(corporate_details).data
            except CorporateUserDetail.DoesNotExist:
                response_data['corporate_details'] = {'message': 'Corporate details not found'}

        return Response({
            "success": True,
            "user_not_logged_in": False,
            "user_unauthorized": False,
            "data": response_data,
            "error": None
        }, status=status.HTTP_200_OK)

    @handle_exceptions
    # @check_authentication()
    def partial_update(self, request, pk):
        """
        API: Partial Update User Profile Details
        Same as update but explicitly supports partial updates
        """
        return self.update(request, pk)


class SellerContactViewSet(viewsets.ViewSet):
    """
    API to get seller contact information with credit deduction
    """
    
    @handle_exceptions
    # @check_authentication()
    def list(self, request):
        """
        API: Get Seller Contact Information
        - Requires listing_id in query parameters or request data
        - Deducts 1 credit from user's wallet
        - Returns seller phone and email if successful
        """
        from MarketPlace.models import SellerListing
        
        # Get request data - try query params first, then POST data
        listing_id = request.query_params.get('listing_id') or request.data.get('listing_id')
        user_id = request.query_params.get('user_id') or request.data.get('user_id')
        
        if not listing_id:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "listing_id is required"
            }, status=status.HTTP_400_BAD_REQUEST)
            
        if not user_id:
            return Response({
                "success": False,
                "user_not_logged_in": True,
                "user_unauthorized": False,
                "data": None,
                "error": "user_id is required"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Get user's wallet
            wallet = Wallet.objects.get(user_id=user_id)
            
            # Reset free credits if due
            wallet.reset_free_credits_if_due()
            
            # Check if user has at least 1 credit
            if wallet.get_total_credits() < 1:
                return Response({
                    "success": False,
                    "user_not_logged_in": False,
                    "user_unauthorized": False,
                    "data": {
                        "free_credits": wallet.free_credits,
                        "paid_credits": wallet.paid_credits,
                        "total_credits": wallet.get_total_credits()
                    },
                    "error": "Not enough credits. Please purchase credits to access seller contact information."
                }, status=status.HTTP_402_PAYMENT_REQUIRED)
            
            # Get the listing
            try:
                listing = SellerListing.objects.get(listing_id=listing_id)
            except SellerListing.DoesNotExist:
                return Response({
                    "success": False,
                    "user_not_logged_in": False,
                    "user_unauthorized": False,
                    "data": None,
                    "error": "Listing not found"
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Get seller details
            try:
                seller = User.objects.get(user_id=listing.seller_user_id)
            except User.DoesNotExist:
                return Response({
                    "success": False,
                    "user_not_logged_in": False,
                    "user_unauthorized": False,
                    "data": None,
                    "error": "Seller not found"
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Deduct 1 credit
            credit_deducted = wallet.deduct_credits(1)
            
            if not credit_deducted:
                return Response({
                    "success": False,
                    "user_not_logged_in": False,
                    "user_unauthorized": False,
                    "data": {
                        "free_credits": wallet.free_credits,
                        "paid_credits": wallet.paid_credits,
                        "total_credits": wallet.get_total_credits()
                    },
                    "error": "Failed to deduct credits. Please try again."
                }, status=status.HTTP_402_PAYMENT_REQUIRED)
            
            # Return seller contact information
            return Response({
                "success": True,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": {
                    "seller_contact": {
                        "seller_id": seller.user_id,
                        "seller_name": seller.name,
                        "phone": seller.contact_number,
                        "email": seller.email,
                        "listing_id": listing_id,
                        "listing_name": listing.listing_name
                    },
                    "credits_remaining": {
                        "free_credits": wallet.free_credits,
                        "paid_credits": wallet.paid_credits,
                        "total_credits": wallet.get_total_credits()
                    },
                    "credit_deducted": 1
                },
                "error": None
            }, status=status.HTTP_200_OK)
            
        except Wallet.DoesNotExist:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "User wallet not found. Please contact support."
            }, status=status.HTTP_404_NOT_FOUND)
        
        except Exception as e:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": f"An error occurred: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class WalletDetailsViewSet(viewsets.ViewSet):
    """
    API to retrieve wallet details for buyers
    """
    
    @handle_exceptions
    # @check_authentication(required_role=['buyer_individual', 'buyer_corporate'])
    def retrieve(self, request, pk=None):
        """
        API: Get Wallet Details for a specific buyer
        - Returns free credits, paid credits, total credits
        - Includes reset date and last activity
        """
        user_id = pk 
        
        # Verify the requested user exists and is a buyer
        try:
            user = User.objects.get(user_id=user_id)
            if user.role not in ['buyer_individual', 'buyer_corporate']:
                return Response({
                    "success": False,
                    "user_not_logged_in": False,
                    "user_unauthorized": True,
                    "data": None,
                    "error": "This API is only available for buyers"
                }, status=status.HTTP_403_FORBIDDEN)
        except User.DoesNotExist:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "User not found"
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check if current user can access this wallet
        # # Only perform this check if user is authenticated
        # if hasattr(request.user, 'role') and request.user.is_authenticated:
        #     if request.user.role != 'admin' and request.user.user_id != user_id:
        #         return Response({
        #             "success": False,
        #             "user_not_logged_in": False,
        #             "user_unauthorized": True,
        #             "data": None,
        #             "error": "You can only access your own wallet details"
        #         }, status=status.HTTP_403_FORBIDDEN)
        # else:
        #     # For unauthenticated users, deny access
        #     return Response({
        #         "success": False,
        #         "user_not_logged_in": True,
        #         "user_unauthorized": False,
        #         "data": None,
        #         "error": "Authentication required to access wallet details"
        #     }, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            # Get wallet details
            wallet = Wallet.objects.get(user_id=user_id)
            
            # Reset free credits if due
            wallet.reset_free_credits_if_due()
            
            # Prepare response data
            response_data = {
                'user_id': user_id,
                'user_name': user.name,
                'user_role': user.role,
                'wallet_details': {
                    'free_credits': wallet.free_credits,
                    'paid_credits': wallet.paid_credits,
                    'total_credits': wallet.get_total_credits(),
                    'free_credit_reset_date': wallet.free_credit_reset_date.strftime('%Y-%m-%d'),
                    'last_updated': wallet.updated_at.strftime('%Y-%m-%d %H:%M:%S'),
                    'created_at': wallet.created_at.strftime('%Y-%m-%d %H:%M:%S')
                },
                'credit_summary': {
                    'can_access_seller_contacts': wallet.get_total_credits() >= 1,
                    'days_until_reset': (wallet.free_credit_reset_date.date() - timezone.now().date()).days,
                    'is_reset_due': timezone.now().date() >= wallet.free_credit_reset_date.date()
                }
            }
            
            return Response({
                "success": True,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": response_data,
                "error": None
            }, status=status.HTTP_200_OK)
            
        except Wallet.DoesNotExist:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": "Wallet not found for this user"
            }, status=status.HTTP_404_NOT_FOUND)
        
        except Exception as e:
            return Response({
                "success": False,
                "user_not_logged_in": False,
                "user_unauthorized": False,
                "data": None,
                "error": f"An error occurred: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
  