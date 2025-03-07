import axios from 'axios';
import { showAlert } from './alert';
export const login = async (email, password) => {
  try {
    const res = await axios({
      method: 'POST',
      url: '/api/v1/users/login',
      data: {
        email,
        password,
      },
    });
    if (res.data.status === 'success') {
      alert('Logged in Successfully');
      window.setTimeout(() => {
        location.assign('/');
      }, 1500);
    }
  } catch (err) {
    alert(err.response.data.message);
  }
};

export const logout = async() => {
  try {
    const res = await axios({
      method: 'GET',
      url: '/api/v1/users/logout',
      
    });
    if(res.data.status === 'success'){
      location.reload(true);
    }
  } catch (err) {
    console.log(err);
    alert('Error logging out ! try again');
  }
};
