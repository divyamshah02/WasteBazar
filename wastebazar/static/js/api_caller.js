async function callApi(method, url, bodyData = null, csrfToken = '', media_upload = false) {
    try {
        // Validate method and URL
        if (typeof method !== 'string' || typeof url !== 'string') {
            throw new Error("Invalid method or URL");
        }

        let headers_data = {}

        if (media_upload) {
            headers_data = {
                ...(csrfToken && { 'X-CSRFToken': csrfToken }),
            };
        }
        else {
            headers_data = {
                'Content-Type': 'application/json',
                ...(csrfToken && { 'X-CSRFToken': csrfToken }),
            };
        }

        // Prepare request options
        const options = {
            method: method.toUpperCase(),
            headers: headers_data
        };

        // Add bodyData for non-GET requests
        if (method.toUpperCase() !== 'GET' && bodyData) {
            if (media_upload) {
                options.body = bodyData;
            }
            else {
                options.body = JSON.stringify(bodyData);
            }
        }

        // Make the fetch request
        const response = await fetch(url, options);
        // console.log(response)

        // Check for HTTP errors
        // if (!response.ok) {
        //     throw new Error(`HTTP Error: ${response.status} - ${response.statusText}`);
        // }


        try {
            const data = await response.json();
            return [true, data];
        }
        catch (error) {
            console.log('Error in parsing JSON:', error);
            window.location.href = `/login/`;
        }

        // Parse the JSON response
        // data = await response.json();

        // Return success flag and data

    } catch (error) {
        // Log and return failure flag with error
        console.error("API Call Error:", error);
        return [false, error.message || "An unknown error occurred"];
    }
}

function toQueryString(params) {
    return Object.keys(params)
        .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(params[key]))
        .join('&');
}


// Example Usage of api caller function
async function exampleApiCallerPOST() {
    const bodyData = {
        email: "divyamshah1234@gmail.com",
        password: "divym",
    };

    const url = "{% url 'login-api-list' %}";
    const [success, result] = await callApi("POST", url, bodyData, "{{csrf_token}}");
    if (success) {
        console.log("Result:", result);
    } else {
        console.error("Login User Failed:", result);
    }
}


async function exampleApiCallerGET() {
    const Params = {
        user_id: "IO7169754192",
    };

    const url = "{% url 'user-list' %}?" + toQueryString(Params); // Construct the full URL with query params
    const [success, result] = await callApi("GET", url);
    if (success) {
        console.log("GET User Success:", result);
    } else {
        console.error("GET User Failed:", result);
    }
}

async function IsUserAuthorized() {
    const url = "/user/is-user-authorized-api/";

    const [success, result] = await callApi("GET", url);

    if (success) {
        if (result.success) {
            return result.data
        }
        else {
            return false
        }

    }
    else {
        return false
    }
}


async function logPageLoadUrl() {
    const currentUrl = window.location.href;
    console.log(`Page loaded from URL: ${currentUrl}`);

    if (currentUrl.includes('dashboard')) {
        document.getElementById('dashboard-nav-tab').className = 'eh-menu-item-active p-3 py-2 mb-2 text-start';
    }
    else if (currentUrl.includes('reports')) {
        document.getElementById('reports-nav-tab').className = 'eh-menu-item-active p-3 py-2 mb-2 text-start';
    }
    else if (currentUrl.includes('question')) {
        document.getElementById('add-question-nav-tab').className = 'eh-menu-item-active p-3 py-2 mb-2 text-start';
    }

    else if (currentUrl.includes('update_running_message')) {
        document.getElementById('running-message-nav-tab').className = 'eh-menu-item-active p-3 py-2 mb-2 text-start';
    }


    if (currentUrl.includes('login')) {

    }
    else {
        let is_user_authorized = await IsUserAuthorized();
        if (is_user_authorized.data) {
            document.getElementById('add-question-nav-tab').style.display = '';

            if (is_user_authorized.user_role != 'medical_officer') {
                document.getElementById('running-message-nav-tab').style.display = '';
            }
        }
    }
}
