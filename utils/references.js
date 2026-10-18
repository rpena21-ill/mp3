// Keeping tasks and users consistent with each other (two-way references).
var User = require('../models/user');
var Task = require('../models/task');
var isValidId = require('./ids').isValidId;
var query = require('./query');
var badRequest = query.badRequest;
var notFound = query.notFound;

// Look up the user a task should be assigned to.
// Returns null if the task is unassigned. Throws 404 / 400 on problems.
async function resolveAssignedUser(fields) {
    if (fields.assignedUser === '') {
        return null;
    }
    var user = await User.findById(fields.assignedUser);
    if (!user) {
        throw notFound('The assigned user does not exist.');
    }
    if (fields.assignedUserName !== undefined && fields.assignedUserName !== user.name) {
        throw badRequest('"assignedUserName" does not match the name of the assigned user.');
    }
    return user;
}

// After a task was saved, fix the pendingTasks of the users involved.
// oldAssignedUser is who the task was assigned to before this request ("" if nobody).
async function syncTaskToUsers(task, oldAssignedUser) {
    var taskId = String(task._id);

    // 1. Remove it from the previous user's pendingTasks
    if (isValidId(oldAssignedUser)) {
        await User.updateOne({ _id: oldAssignedUser }, { $pull: { pendingTasks: taskId } });
    }

    // 2. Add it to the current user's pendingTasks if it is still pending
    if (task.assignedUser !== '' && !task.completed) {
        await User.updateOne({ _id: task.assignedUser }, { $addToSet: { pendingTasks: taskId } });
    }
}

// Check that every id in pendingTasks is an existing, not-completed task.
async function checkPendingTasks(taskIds) {
    if (taskIds.length === 0) {
        return;
    }
    var tasks = await Task.find({ _id: { $in: taskIds } });
    if (tasks.length !== taskIds.length) {
        throw notFound('One or more tasks in "pendingTasks" do not exist.');
    }
    var hasCompleted = tasks.some(function (task) { return task.completed; });
    if (hasCompleted) {
        throw badRequest('"pendingTasks" cannot contain completed tasks.');
    }
}

// After a user was saved, update the tasks so they agree with the user.
// oldPendingTasks is the user's pendingTasks before this request ([] for a new user).
async function syncUserToTasks(user, oldPendingTasks) {
    var userId = String(user._id);
    var newIds = user.pendingTasks.map(String);
    var removed = oldPendingTasks.filter(function (id) {
        return newIds.indexOf(id) === -1;
    });

    // 1. Tasks the user no longer has become unassigned
    if (removed.length > 0) {
        await Task.updateMany(
            { _id: { $in: removed }, assignedUser: userId },
            { $set: { assignedUser: '', assignedUserName: 'unassigned' } }
        );
    }

    if (newIds.length > 0) {
        // 2. Take these tasks away from any other user that has them
        await User.updateMany(
            { _id: { $ne: user._id }, pendingTasks: { $in: newIds } },
            { $pull: { pendingTasks: { $in: newIds } } }
        );

        // 3. Assign them to this user
        await Task.updateMany(
            { _id: { $in: newIds } },
            { $set: { assignedUser: userId, assignedUserName: user.name } }
        );
    }

    // 4. Every task of this user (completed ones too) shows the current name
    await Task.updateMany(
        { assignedUser: userId },
        { $set: { assignedUserName: user.name } }
    );
}

module.exports = {
    resolveAssignedUser: resolveAssignedUser,
    syncTaskToUsers: syncTaskToUsers,
    checkPendingTasks: checkPendingTasks,
    syncUserToTasks: syncUserToTasks
};