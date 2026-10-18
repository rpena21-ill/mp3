var User = require('../models/user');
var response = require('../utils/response');
var isValidId = require('../utils/ids').isValidId;
var findMany = require('../utils/query').findMany;
var handleError = response.handleError;
var parseSelect = require('../utils/query').parseSelect;
var validateUserBody = require('../utils/validate').validateUserBody;

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

    // PUT /api/users/:id: replace a user
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

            // 2. Body must be valid
            var fields = validateUserBody(req.body);

            // The email can't belong to a *different* user
            var emailOwner = await User.findOne({ email: fields.email, _id: { $ne: user._id } });
            if (emailOwner) {
                return send(res, 400, 'A user with this email already exists.', {});
            }

            // 3. Replace the fields (dateCreated is never touched)
            user.name = fields.name;
            user.email = fields.email;
            // pendingTasks is handled in Step 9 (two-way references)

            var saved = await user.save();
            return send(res, 200, 'User updated', saved);
        } catch (err) {
            return handleError(res, err);
        }
    });

    // POST /api/users: create a user
    usersRoute.post(async function (req, res) {
        try {
            var fields = validateUserBody(req.body);

            var existing = await User.findOne({ email: fields.email });
            if (existing) {
                return send(res, 400, 'A user with this email already exists.', {});
            }

            var saved = await new User(fields).save();
            return send(res, 201, 'User created', saved);
        } catch (err) {
            return handleError(res, err);
        }
    });

    return router;
};