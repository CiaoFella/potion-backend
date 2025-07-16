import { TimeTracker } from "../models/TimeTracker";
import { User } from "../models/User";

export const timeTrackerController = {
  async toggleTimeTracker(req: any, res: any) {
    try {
      const { projectId } = req.body;

      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (user.currentSession) {
        const timeTracker: any = await TimeTracker.findById(
          user?.currentSession
        );
        if (!timeTracker) {
          return res.status(404).json({ error: "No session found" });
        }

        const endTime: any = new Date();
        const duration = Math.floor(
          (endTime - timeTracker.startTime) / (1000 * 60)
        ); // Duration in minutes

        timeTracker.endTime = endTime;
        timeTracker.duration = duration;
        timeTracker.save();

        user.currentSession = null;
        user.save();

        res.status(201).json(timeTracker);
      } else {
        const timeTracker = new TimeTracker({
          createdBy: req.user.userId,
          startTime: new Date(),
          date: new Date(),
          project: projectId,
        });

        user.currentSession = timeTracker._id;
        user.save();

        await timeTracker.save();
        res.status(201).json(timeTracker);
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },

  async getTimeTrackers(req: any, res: any) {
    try {
      const sessions = await TimeTracker.find({
        createdBy: req.user.userId,
      }).sort({ createdAt: -1 });

      res.json(sessions);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch sessions" });
    }
  },

  async getRange(req: any, res: any) {
    try {
      const { startDate, endDate } = req.query;

      const timeEntries = await TimeTracker.find({
        createdBy: req.user.userId,
        startTime: {
          $gte: startDate,
          $lte: new Date(endDate),
        },
      }).populate("project");

      // Calculate daily totals
      const dailyTotals = timeEntries.reduce((acc: any, entry) => {
        const day = entry.date.toISOString().split("T")[0];
        acc[day] = (acc[day] || 0) + (entry.duration || 0);
        return acc;
      }, {});

      // Calculate project totals
      const projectTotals = timeEntries.reduce((acc: any, entry: any) => {
        const projectId = entry?.project._id.toString();
        acc[projectId] = {
          name: entry?.project?.name,
          duration: (acc[projectId]?.duration || 0) + (entry.duration || 0),
        };
        return acc;
      }, {});

      res.json({
        entries: timeEntries,
        dailyTotals,
        projectTotals,
        totalDuration: timeEntries.reduce(
          (sum, entry) => sum + (entry.duration || 0),
          0
        ),
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: "Failed to fetch time entries" });
    }
  },

  async getToday(req: any, res: any) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const entries = await TimeTracker.find({
        createdBy: req.user.userId,
        startTime: {
          $gte: today,
          $lt: tomorrow,
        },
      }).populate("project");

      const totalDuration = entries.reduce(
        (sum, entry) => sum + (entry.duration || 0),
        0
      );

      res.json({
        entries,
        totalDuration,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch today's entries" });
    }
  },

  async getThisWeek(req: any, res: any) {
    try {
      const today = new Date();
      const firstDayOfWeek = new Date(
        today.setDate(today.getDate() - today.getDay())
      ); // Sunday
      firstDayOfWeek.setHours(0, 0, 0, 0);
      const lastDayOfWeek = new Date(firstDayOfWeek);
      lastDayOfWeek.setDate(lastDayOfWeek.getDate() + 7); // Next Sunday

      const entries = await TimeTracker.find({
        createdBy: req.user.userId,
        startTime: {
          $gte: firstDayOfWeek,
          $lt: lastDayOfWeek,
        },
      }).populate("project");

      const totalDuration = entries.reduce(
        (sum, entry) => sum + (entry.duration || 0),
        0
      );

      res.json({
        entries,
        totalDuration,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch this week's entries" });
    }
  },

  async getCurrentTracker(req: any, res: any) {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.currentSession) {
      const timeTracker: any = await TimeTracker.findById(user?.currentSession);
      if (!timeTracker) {
        return res.status(404).json({ error: "No session found" });
      }

      res.status(201).json({ data: timeTracker, status: true });
    } else {
      res
        .status(201)
        .json({ message: "No tracker is running currently", status: false });
    }
  },
};
