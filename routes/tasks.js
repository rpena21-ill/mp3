var User = require('../models/user');
var Task = require('../models/task');
var response = require('../utils/response');
var isValidId = require('../utils/ids').isValidId;
var findMany = require('../utils/query').findMany;
var handleError = response.handleError;
var parseSelect = require('../utils/query').parseSelect;
var validateTaskBody = require('../utils/validate').validateTaskBody;
var references = require('../utils/references');

var send = response.send;
var serverError = response.serverError;

module.exports = function (router) {
    // Copy validated fields onto a task document.
    // user is the assigned user document, or null for unassigned.
    function applyTaskFields(task, fields, user) {
        task.name = fields.name;
        task.description = fields.description;
        task.deadline = fields.deadline;
        task.completed = fields.completed;
        task.assignedUser = user ? String(user._id) : '';
        task.assignedUserName = user ? user.name : 'unassigned';
    }

    // ----- /api/tasks -----
    var tasksRoute = router.route('/tasks');

    // GET /api/tasks: list tasks (supports query parameters)
    tasksRoute.get(async function (req, res) {
        try {
            var tasks = await findMany(Task, req.query, 100);
            return send(res, 200, 'OK', tasks);
        } catch (err) {
            return handleError(res, err);
        }
    });

    // ----- /api/tasks/:id -----
    var taskRoute = router.route('/tasks/:id');

        // GET /api/tasks/:id: one task, or 404 (supports select)
    taskRoute.get(async function (req, res) {
        try {
            if (!isValidId(req.params.id)) {
                return send(res, 404, 'Task not found', {});
            }
            var select = parseSelect(req.query);

            var dbQuery = Task.findById(req.params.id);
            if (select !== undefined) {
                dbQuery = dbQuery.select(select);
            }
            var task = await dbQuery.exec();

            if (!task) {
                return send(res, 404, 'Task not found', {});
            }
            return send(res, 200, 'OK', task);
        } catch (err) {
            return handleError(res, err);
        }
    });

    // PUT /api/tasks/:id: replace a task (and keep users' pendingTasks in sync)
    taskRoute.put(async function (req, res) {
        try {
            // 1. URL id must point to an existing task
            if (!isValidId(req.params.id)) {
                return send(res, 404, 'Task not found', {});
            }
            var task = await Task.findById(req.params.id);
            if (!task) {
                return send(res, 404, 'Task not found', {});
            }

            // 2-4. Body format, then referenced user
            var fields = validateTaskBody(req.body);
            var user = await references.resolveAssignedUser(fields);

            // Remember the previous user before overwriting
            var oldAssignedUser = task.assignedUser;

            applyTaskFields(task, fields, user);
            var saved = await task.save();

            await references.syncTaskToUsers(saved, oldAssignedUser);
            return send(res, 200, 'Task updated', saved);
        } catch (err) {
            return handleError(res, err);
        }
    });

    // DELETE /api/tasks/:id: delete a task and remove it from its user's pendingTasks
    taskRoute.delete(async function (req, res) {
        try {
            if (!isValidId(req.params.id)) {
                return send(res, 404, 'Task not found', {});
            }
            var task = await Task.findById(req.params.id);
            if (!task) {
                return send(res, 404, 'Task not found', {});
            }

            // Keep the two-way reference: the user must no longer list this task
            if (isValidId(task.assignedUser)) {
                await User.updateOne(
                    { _id: task.assignedUser },
                    { $pull: { pendingTasks: String(task._id) } }
                );
            }

            await task.deleteOne();
            return send(res, 204, 'Task deleted', {});
        } catch (err) {
            return handleError(res, err);
        }
    });

    // POST /api/tasks: create a task (and add it to its user's pendingTasks)
    tasksRoute.post(async function (req, res) {
        try {
            var fields = validateTaskBody(req.body);                 // 400 checks
            var user = await references.resolveAssignedUser(fields); // 404 / 400 checks

            var task = new Task();
            applyTaskFields(task, fields, user);
            var saved = await task.save();

            await references.syncTaskToUsers(saved, ''); // new task: no previous user
            return send(res, 201, 'Task created', saved);
        } catch (err) {
            return handleError(res, err);
        }
    });

    return router;
};