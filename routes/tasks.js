var Task = require('../models/task');
var response = require('../utils/response');
var isValidId = require('../utils/ids').isValidId;
var findMany = require('../utils/query').findMany;
var handleError = response.handleError;
var parseSelect = require('../utils/query').parseSelect;

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