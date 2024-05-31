import axios from 'axios';
import Stripe from 'stripe';
const stripe = Stripe(
  'pk_test_51PIbJrSIXY2vt5JVXnL9QiTCWiTaMiGrhP8ggSCBka0FBYbNS7JoOhioBlGYsA7SKE7IB5MtieD2dyFIR6IaoOUX00iajWXGPV',
);
export const bookTour = async (tourId) => {
  try {
    const session = await axios(
      `/api/v1/booking/checkout-session/${tourId}`,
    );

    window.location.assign(session.data.session.url);
  } catch {}
};
