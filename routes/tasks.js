var Task = require('../models/task');
var response = require('../utils/response');
var isValidId = require('../utils/ids').isValidId;
var findMany = require('../utils/query').findMany;
var handleError = response.handleError;

var send = response.send;
var serverError = response.serverError;

module.exports = function (router) {

    // ----- /api/tasks -----
    var tasksRoute = router.route('/tasks');

    // GET /api/tasks: list tasks (supports query parameters)
    tasksRoute.get(async function (req, res) {
        try {
            var tasks = await findMany(Task, req.query);
            return send(res, 200, 'OK', tasks);
        } catch (err) {
            return handleError(res, err);
        }
    });

    // ----- /api/tasks/:id -----
    var taskRoute = router.route('/tasks/:id');

    // GET /api/tasks/:id: one task, or 404
    taskRoute.get(async function (req, res) {
        try {
            if (!isValidId(req.params.id)) {
                return send(res, 404, 'Task not found', {});
            }

            var task = await Task.findById(req.params.id);
            if (!task) {
                return send(res, 404, 'Task not found', {});
            }

            return send(res, 200, 'OK', task);
        } catch (err) {
            return serverError(res, err);
        }
    });

    // POST /api/tasks: create a task (minimal version, validation comes in Step 6)
    tasksRoute.post(async function (req, res) {
        try {
            var task = new Task({
                name: req.body.name,
                description: req.body.description,
                deadline: req.body.deadline,
                completed: req.body.completed
            });

            var saved = await task.save();
            return send(res, 201, 'Task created', saved);
        } catch (err) {
            return serverError(res, err);
        }
    });

    return router;
};