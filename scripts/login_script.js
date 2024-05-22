//const service = service()
const host = "https://localhost:8082"

console.log(document.cookie)

function validateUsername(value) {
    if (value == '') {
        return "please enter username";
    }
    len = String(value).length
    if (len < 6 || len > 10) {
        return "username must be 6-10 chars long"
    }
    return "success"
}

function validateEmail(value) {
    if (value == '') {
        return 'please enter email'
    }
    var regexEmail1 = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/ // source: https://www.w3resource.com/javascript/form/email-validation.php
    var regexEmail2 = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/ // source: https://stackoverflow.com/questions/46155/how-can-i-validate-an-email-address-in-javascript
    if (!String(value).toLowerCase().match(regexEmail1)) {
        return "email not valid"
    }
    return "success"
}

function validatePassword(value) {
    //console.log(value)
    if (value == '') {
        return "please enter password"
    }
    len = String(value).length
    if (len < 8) {
        return 'passowrd must contain at least 8 chars'
    }
    // must contain 8 chars, at least one uppercase, one lowercase, one number, and one special 
    // char
    //var regexPassword = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$"
    // anything with no number or no uppercase or no lowercase or no special char
    var regexPassword = "^(.{0,7}|[^0-9]*|[^A-Z]*|[^a-z]*|[a-zA-Z0-9]*)$"
    const regEx = new RegExp(regexPassword)
    if (regEx.test(value)) {
    //if (!String(value).match(regexPassword)) {
        return "password must contain at least one uppercase, one lowercase, one number, and one special char"
    }
    return "success"
}

function alertFormEmpty(msg) {
    elem = document.getElementById('user_info').children[1]
    console.log(elem)
    elem.innerText = msg
    elem.style['opacity'] = 1
}

function resetSigninForm() {
    const signinForm = document.getElementById('signin_form')
    Array.from(signinForm.children).forEach(elem => {
        // use id on info_wrapper and fix input child position
        Array.from(elem.children).forEach(sub_elem => {
            if (sub_elem['id'] !== undefined && (sub_elem['id'] === 'email' || sub_elem['id'] === 'password')) {
                sub_elem.value = ''
            }
        })
    })
}

function resetCreateAccountForm() {
    const form = {'username': '', 'email': '', 'password': '', "confirmPassword": ''}
    const elements = Array.from(document.getElementById('create_account_form').children)
    elements.forEach(elem => {
        elem.style['border-color'] = 'unset'
        Array.from(elem.children).forEach(sub_elem => {
            if (sub_elem['id'] !== undefined && form[sub_elem.id] !== undefined) {
                sub_elem.value = form[sub_elem.id]
            }
        })
    })

}

function resetForgotPasswordForm() {
    document.getElementById('forgot_password_form').children[0].children[2].value = ''
}

function signin(event) {
    console.log(`signin clicked: ${event.target}`)
    const signin_form = document.getElementById("signin_form")

    resetCreateAccountForm()
    document.getElementById('create_account_form').style['visibility'] = 'hidden'
    document.getElementById("submit_form").children[0].style['opacity'] = 0
    document.getElementById('verification_link').style['visibility'] = 'hidden'

    resetForgotPasswordForm()
    document.getElementById('forgot_password_form').style['visibility'] = 'hidden'
    document.getElementById('reset_password_link').style['visibility'] = 'hidden'

    document.getElementById('user_info').children[1].style['opacity'] = 0

    Array.from(signin_form.children).forEach(elem => {
        elem.style['border-color'] = 'unset'
    })

    document.getElementById('email').value = ''
    document.getElementById('password').value = ''

    signin_form.style['visibility'] = 'visible'
}

function appendToCookie(key, value) {
    const tokens = document.cookie.split(';')
    for (let token of tokens) {
        sub_tokens = token.split('=')
        if (sub_tokens[0] == key && sub_tokens[1] == value) {
            console.log(`cookie ${key}=${value} is already present`)
            return
        }
    }
    document.cookie = document.cookie + `${key}=${value};`
}

async function login(event) {
    const signin_form = document.getElementById('signin_form')
    signin_form.children[0].style['border-color'] = 'unset'
    signin_form.children[1].style['border-color'] = 'unset'
    document.getElementById('user_info').children[1].style['opacity'] = 0

    email = signin_form.children[0].children[2]
    password =  signin_form.children[1].children[2]
    let msg = validateEmail(email.value)
    if (!String(msg).match("success")) {
        const singin_form = document.getElementById('signin_form')
        signin_form.children[0].style['border-color'] = 'red'
        alertFormEmpty(msg)
        return
    }

    msg = validatePassword(password.value)
    if (!String(msg).match("success")) {
        const singin_form = document.getElementById('signin_form')
        signin_form.children[1].style['border-color'] = 'red'
        alertFormEmpty(msg)
        return
    }
    let params = {}
    params.identifier = null
    params.email = email.value
    params.password = password.value
    //params.email = null
    //params.password = null
    console.log(`[login request] email ${email.value}, password ${password.value}`)
    
    findUser(axios, params).then(data => {
        console.log(`[user login response] ${JSON.stringify(data)}`)
        const user = data.data
        if (user !== undefined) {
            console.log(user)
            appendToCookie('username', user.username)
            console.log(document.cookie)
            email.value = ''
            password.value = ''
            window.location.pathname = '/dashboard'
            //window.location.href = `${host}/dashboard`
        }
    },
    error => {
        console.log(error)
    })

    //loginAccount(email, password)
}

async function submitForm(event) {
    let form = {
        'username': '',
        'email': '',
        'password': '',
        'confirmPassword': ''
    }
    const elements = Array.from(document.getElementById('create_account_form').children)
    elements.forEach(elem => elem.style['border-color'] = 'unset')

    for(let sub_elem of elements) {
        const id = sub_elem.children[2].id
        const value = sub_elem.children[2].value
        console.log(`id: ${id}, value: ${value}`)
        if (id === 'confirmPassword' && form['password'] !== value) {
            //sub_elem.children[3].style['opacity'] = 1;
            console.log(value)
            let msg = ''
            if (value == '') {
                msg = 'please enter confirm password'
            } else {
                msg = 'passwords do not match'
            } 
            sub_elem.style['border-color'] = 'red'
            alertFormEmpty(msg)
            return
        }
        if (id !== 'confirmPassword') {
            let msg = ''
            switch (id) {
                case "username":
                    msg = validateUsername(value)
                    break
                case "email":
                    msg = validateEmail(value)
                    break
                case "password":
                    msg = validatePassword(value)
                    break

                default:
                    console.log('invalid id')
                    break
            }
            if (!String(msg).match('success')) {
                sub_elem.style['border-color'] = 'red'
                //sub_elem.style['border-color'] = 'unset'
                //sub_elem.children[3].style['opacity'] = 1;
                alertFormEmpty(msg)
                return
            }
        }
        form[id] = value
    }
    submitFormServer(form).then(data => {
        console.log(data)
        if (data['success'] == true) {
            document.getElementById('user_info').children[1].style['opacity'] = 0
            resetCreateAccountForm()
            document.getElementById("submit_form").children[0].style['opacity'] = 0
            document.getElementById('create_account_form').style['visibility'] = 'hidden'
            document.getElementById('verification_link').style['visibility'] = 'visible'
        } else {
            alertFormEmpty(data['error'])
        }
        
    })

}

function sendLink(event) {
    console.log('send link is clicked')
    const forgot_password_form = document.getElementById('forgot_password_form')
    const email = forgot_password_form.children[0].children[2]
    const msg = validateEmail(email.value)
    if (!String(msg).match("success")) {
        forgot_password_form.children[0].style['border-color'] = 'red'
        alertFormEmpty(msg)
        return
    }
    forgot_password_form.children[0].style['border-color'] = 'unset'
    document.getElementById('user_info').children[1].style['opacity'] = 0
    forgot_password_form.style['visibility'] = 'hidden'
    document.getElementById('reset_password_link').style['visibility'] = 'visible'
}

function forgotPassword(event) {
    console.log(`forgotPassword clicked: ${event}`)

    resetCreateAccountForm()
    document.getElementById('create_account_form').style['visibility'] = 'hidden'
    document.getElementById("submit_form").children[0].style['opacity'] = 0
    document.getElementById('verification_link').style['visibility'] = 'hidden'

    resetSigninForm()
    document.getElementById("signin_form").style['visibility'] = 'hidden'

    resetForgotPasswordForm()
    document.getElementById('forgot_password_form').children[0].style['border-color'] = 'unset'
    document.getElementById('reset_password_link').style['visibility'] = 'hidden'
    document.getElementById('user_info').children[1].style['opacity'] = 0
    document.getElementById('forgot_password_form').style['visibility'] = 'visible'

}

function createAccount(event) {
    console.log(`createAccount clicked: ${event}`)
    resetSigninForm()
    document.getElementById('signin_form').style['visibility'] = 'hidden'

    resetForgotPasswordForm()
    document.getElementById('forgot_password_form').style['visibility'] = 'hidden'
    document.getElementById('reset_password_link').style['visibility'] = 'hidden'

    resetCreateAccountForm()
    document.getElementById('create_account_form').style['visibility'] = 'visible'
    document.getElementById('user_info').children[1].style['opacity'] = 0
    document.getElementById("submit_form").children[0].style['opacity'] = 1
}