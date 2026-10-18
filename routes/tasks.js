var Task = require('../models/task');
var response = require('../utils/response');
var isValidId = require('../utils/ids').isValidId;
var findMany = require('../utils/query').findMany;
var handleError = response.handleError;
var parseSelect = require('../utils/query').parseSelect;
var validateTaskBody = require('../utils/validate').validateTaskBody;

var send = response.send;
var serverError = response.serverError;

module.exports = function (router) {

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

    // GET /api/tasks/:id: one user, or 404 (supports select)
    taskRoute.get(async function (req, res) {
        try {
            if (!isValidId(req.params.id)) {
                return send(res, 404, 'User not found', {});
            }
            var select = parseSelect(req.query);

            var dbQuery = User.findById(req.params.id);
            if (select !== undefined) {
                dbQuery = dbQuery.select(select);
            }
            var user = await dbQuery.exec();

            if (!task) {
                return send(res, 404, 'Task not found', {});
            }
            return send(res, 200, 'OK', user);
        } catch (err) {
            return handleError(res, err);
        }
    });

    // PUT /api/tasks/:id: replace a task
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

            // 2. Body must be valid (missing optional fields get their defaults)
            var fields = validateTaskBody(req.body);

            // 3. Replace the fields (dateCreated is never touched)
            task.name = fields.name;
            task.description = fields.description;
            task.deadline = fields.deadline;
            task.completed = fields.completed;
            // assignedUser / assignedUserName are handled in Step 9

            var saved = await task.save();
            return send(res, 200, 'Task updated', saved);
        } catch (err) {
            return handleError(res, err);
        }
    });

    // POST /api/tasks: create a task
    tasksRoute.post(async function (req, res) {
        try {
            var fields = validateTaskBody(req.body);
            var saved = await new Task(fields).save();
            return send(res, 201, 'Task created', saved);
        } catch (err) {
            return handleError(res, err);
        }
    });

    return router;
};