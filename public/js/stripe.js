import axios from 'axios';
import Stripe from 'stripe';
const stripe = Stripe(
  'pk_test_51PIbJrSIXY2vt5JVXnL9QiTCWiTaMiGrhP8ggSCBka0FBYbNS7JoOhioBlGYsA7SKE7IB5MtieD2dyFIR6IaoOUX00iajWXGPV',
);
export const bookTour = async (tourId) => {
  try {
    const session = await axios(
      `http://localhost:3000/api/v1/booking/checkout-session/${tourId}`,
    );
    console.log(session);

    window.location.assign(session.data.session.url);
  } catch {}
};
