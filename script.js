function openModal() {
    document.getElementById('registrationModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('registrationModal').style.display = 'none';
}

function openLoginModal() {
    document.getElementById('loginModal').style.display = 'block';
}

function closeLoginModal() {
    document.getElementById('loginModal').style.display = 'none';
}

function submitForm() {
    // Validate form data
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;

    // Create user data object
    const userData = {
        name: name,
        email: email,
        phone: phone,
    };

    // Make AJAX request using the fetch API
    fetch('/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
    })
    .then(response => response.json())
    .then(data => {
        // Handle success
        alert(data.message); // Show the success message
        closeModal(); // Close the modal
    })
    .catch(error => {
        // Handle error
        console.error('Error submitting form:', error);
        alert('An error occurred. Please try again.'); // Show an error message
    });
}

function submitLoginForm() {
    // Validate login form data
    const loginEmail = document.getElementById('loginEmail').value;
    const loginPassword = document.getElementById('loginPassword').value;

    // Make AJAX request using the fetch API
    fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            email: loginEmail,
            password: loginPassword,
        }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            // Handle error
            console.error('Error during login:', data.error);
            alert('Invalid credentials. Please try again.'); // Show an error message
        } else {
            // Handle success
            alert(data.message); // Show the success message
            // Assuming you want to redirect to a welcome page upon successful login
            if (data.message && data.message.startsWith('Welcome')) {
                window.location.href = '/welcome?name=' + encodeURIComponent(data.message.split(' ')[1]);
            }
        }
        closeLoginModal(); // Close the login modal
    })
    .catch(error => {
        // Handle other types of errors
        console.error('Error during login:', error);
        alert('An error occurred. Please try again.'); // Show a generic error message
    });
}

document.getElementById('registerBtn').addEventListener('click', openModal);
document.getElementById('loginBtn').addEventListener('click', openLoginModal);
