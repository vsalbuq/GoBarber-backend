import { format, parseISO } from 'date-fns';
import en from 'date-fns/locale/en-US';

import Mail from '../../lib/Mail';

class CancellationMail {
  get key() {
    return 'CancellationMail';
  }

  async handle({ data }) {
    const { appointment } = data;

    await Mail.sendMail({
      to: `${appointment.provider.name} <${appointment.provider.email}>`,
      subject: 'Appointment cancelled',
      template: 'cancellation',
      context: {
        provider: appointment.provider.name,
        user: appointment.user.name,
        date: format(
          parseISO(appointment.date),
          "MMM' 'dd', at 'hh:mmaaaaa'm'",
          {
            locale: en,
          }
        ),
      },
    });
  }
}

export default new CancellationMail();
