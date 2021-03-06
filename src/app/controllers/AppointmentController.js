import * as Yup from 'yup';
import { startOfHour, parseISO, isBefore, format, subHours } from 'date-fns';
import en from 'date-fns/locale/en-US';

// Models
import Appointment from '../models/Appointment';
import User from '../models/User';
import File from '../models/File';
import Notification from '../schemas/Notification';

// Features
import Queue from '../../lib/Queue';

import CancellationMail from '../jobs/CancellationMail';

class AppointmentController {
  async index(req, res) {
    const { page = 1 } = req.query;

    const appointments = await Appointment.findAll({
      where: { user_id: req.userId, canceled_at: null },
      order: ['date'],
      attributes: ['id', 'date', 'past', 'cancellable'],
      limit: 20,
      offset: (page - 1) * 20,
      include: [
        {
          model: User,
          as: 'provider',
          attributes: ['id', 'name'],
          include: [
            {
              model: File,
              as: 'avatar',
              attributes: ['id', 'path', 'url'],
            },
          ],
        },
      ],
    });

    return res.json(appointments);
  }

  async store(req, res) {
    const schema = Yup.object().shape({
      provider_id: Yup.number().required(),
      date: Yup.date().required(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation failed.' });
    }

    const { provider_id, date } = req.body;

    /**
     * Checks if provider_id is a provider
     */
    const isProvider = await User.findOne({
      where: { id: provider_id, provider: true },
    });

    if (!isProvider) {
      return res.status(401).json({
        error: 'You can create appointments only with providers.',
      });
    }

    if (isProvider.id === req.userId) {
      return res
        .status(400)
        .json({ error: `You can't create appointments with yourself.` });
    }

    /**
     * Check if date is past
     */

    const hourStart = startOfHour(parseISO(date));

    if (isBefore(hourStart, new Date())) {
      return res.status(400).json({ error: 'Past dates are not permitted.' });
    }

    /**
     * Check if date is available
     */

    const isNotAvailable = await Appointment.findOne({
      where: {
        provider_id,
        canceled_at: null,
        date: hourStart,
      },
    });

    if (isNotAvailable) {
      return res.status(400).json({
        error: 'Appointment date is not available.',
      });
    }

    const appointment = await Appointment.create({
      user_id: req.userId,
      provider_id,
      date,
    });

    /**
     * Notify appointment provider
     */
    const user = await User.findByPk(req.userId);
    const formattedDate = format(hourStart, "MMM' 'dd', at 'hh:mmaaaaa'm'", {
      locale: en,
    });

    await Notification.create({
      content: `New appointment with ${user.name} set to ${formattedDate}.`,
      user: provider_id,
    });

    return res.json(appointment);
  }

  async delete(req, res) {
    console.log(req.params.id);
    const appointment = await Appointment.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'provider',
          attributes: ['name', 'email'],
        },
        {
          model: User,
          as: 'user',
          attributes: ['name'],
        },
      ],
    });

    if (!appointment) {
      return res
        .status(400)
        .json({ error: 'There is not appointment with that id.' });
    }

    if (appointment.user_id !== req.userId) {
      return res.status(401).json({
        error: "You don't have permission to cancel this appointment.",
      });
    }

    const cancelLimitDate = subHours(appointment.date, 2);

    if (isBefore(cancelLimitDate, new Date())) {
      return res.status(401).json({
        error:
          'You can cancel an appointment up only until 2 hours before the scheduled time.',
      });
    }

    appointment.canceled_at = new Date();

    await appointment.save();

    await Queue.add(CancellationMail.key, { appointment });

    return res.json(appointment);
  }
}

export default new AppointmentController();
