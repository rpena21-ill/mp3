var User = require('../models/user');
var Task = require('../models/task');
var response = require('../utils/response');
var isValidId = require('../utils/ids').isValidId;
var findMany = require('../utils/query').findMany;
var handleError = response.handleError;
var parseSelect = require('../utils/query').parseSelect;
var validateUserBody = require('../utils/validate').validateUserBody;
var references = require('../utils/references');

var send = response.send;
var serverError = response.serverError;

module.exports = function (router) {

    // ----- /api/users -----
    var usersRoute = router.route('/users');

    // GET /api/users: list users (supports query parameters)
    usersRoute.get(async function (req, res) {
        try {
            var users = await findMany(User, req.query);
            return send(res, 200, 'OK', users);
        } catch (err) {
            return handleError(res, err);
        }
    });

    // ----- /api/users/:id -----
    var userRoute = router.route('/users/:id');

    // GET /api/users/:id: one user, or 404 (supports select)
    userRoute.get(async function (req, res) {
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

            if (!user) {
                return send(res, 404, 'User not found', {});
            }
            return send(res, 200, 'OK', user);
        } catch (err) {
            return handleError(res, err);
        }
    });

    // PUT /api/users/:id: replace a user (and update their tasks to match)
    userRoute.put(async function (req, res) {
        try {
            // 1. URL id must point to an existing user
            if (!isValidId(req.params.id)) {
                return send(res, 404, 'User not found', {});
            }
            var user = await User.findById(req.params.id);
            if (!user) {
                return send(res, 404, 'User not found', {});
            }

            // 2. Body format and duplicate email (400)
            var fields = validateUserBody(req.body);
            var emailOwner = await User.findOne({ email: fields.email, _id: { $ne: user._id } });
            if (emailOwner) {
                return send(res, 400, 'A user with this email already exists.', {});
            }

            // 3-4. Referenced tasks exist (404) and are not completed (400)
            await references.checkPendingTasks(fields.pendingTasks);

            // Remember the old list before overwriting it
            var oldPendingTasks = user.pendingTasks.map(String);

            user.name = fields.name;
            user.email = fields.email;
            user.pendingTasks = fields.pendingTasks;
            var saved = await user.save();

            await references.syncUserToTasks(saved, oldPendingTasks);
            return send(res, 200, 'User updated', saved);
        } catch (err) {
            return handleError(res, err);
        }
    });

    // DELETE /api/users/:id: delete a user and unassign all their tasks
    userRoute.delete(async function (req, res) {
        try {
            if (!isValidId(req.params.id)) {
                return send(res, 404, 'User not found', {});
            }
            var user = await User.findById(req.params.id);
            if (!user) {
                return send(res, 404, 'User not found', {});
            }

            // Keep the two-way reference: no task may still point to this user
            await Task.updateMany(
                { assignedUser: String(user._id) },
                { $set: { assignedUser: '', assignedUserName: 'unassigned' } }
            );

            await user.deleteOne();
            return send(res, 204, 'User deleted', {});
        } catch (err) {
            return handleError(res, err);
        }
    });

    // POST /api/users: create a user (and assign the tasks in pendingTasks to them)
    usersRoute.post(async function (req, res) {
        try {
            var fields = validateUserBody(req.body); // 400: format

            var existing = await User.findOne({ email: fields.email });
            if (existing) {
                return send(res, 400, 'A user with this email already exists.', {});
            }

            await references.checkPendingTasks(fields.pendingTasks); // 404 / 400

            var saved = await new User(fields).save();
            await references.syncUserToTasks(saved, []); // new user: no previous tasks
            return send(res, 201, 'User created', saved);
        } catch (err) {
            return handleError(res, err);
        }
    });

    return router;
};