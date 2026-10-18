var Task = require('../models/task');
var response = require('../utils/response');
var isValidId = require('../utils/ids').isValidId;

var send = response.send;
var serverError = response.serverError;

module.exports = function (router) {

    // ----- /api/tasks -----
    var tasksRoute = router.route('/tasks');

    // GET /api/tasks: list all tasks
    tasksRoute.get(async function (req, res) {
        try {
            var tasks = await Task.find();
            return send(res, 200, 'OK', tasks);
        } catch (err) {
            return serverError(res, err);
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

    return router;
};