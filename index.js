var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _this = this;
require("dotenv").config();
var argv = require("yargs/yargs")(process.argv.slice(2))
    .usage("Usage: $0 -ct [content type uid to copy]")
    .options({
    ct: { type: "string", demandOption: true, alias: "ContentType" },
}).argv;
var contentType = argv.ct;
var BASE_URL = "https://api.contentstack.io/v3/";
var targetStacks = [
    {
        name: "Goal-Oriented Bicycling",
        key: "blt38fde950b30192d4",
    },
];
var sourceStack = {
    name: "Stylish Outdoor Gear",
    key: "blt2e8819a463338e6b",
};
var login = function () { return __awaiter(_this, void 0, void 0, function () {
    var user, loginResponse, loginJSON;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                user = {
                    user: {
                        email: process.env.USER_EMAIL,
                        password: process.env.USER_PASSWORD,
                        tfa_token: "",
                    },
                };
                console.log(user);
                return [4 /*yield*/, fetch("".concat(BASE_URL, "user-session"), {
                        headers: {
                            "Content-Type": "application/json",
                        },
                        method: "POST",
                        body: JSON.stringify(user),
                    })];
            case 1:
                loginResponse = _b.sent();
                return [4 /*yield*/, loginResponse.json()];
            case 2:
                loginJSON = _b.sent();
                return [2 /*return*/, (_a = loginJSON === null || loginJSON === void 0 ? void 0 : loginJSON.user) === null || _a === void 0 ? void 0 : _a.authtoken];
        }
    });
}); };
// const authtoken = login().then((result) => console.log(result));
var getStacks = function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
    return [2 /*return*/];
}); }); };
var getContentTypeSchema = function (authtoken) { return __awaiter(_this, void 0, void 0, function () {
    var ctResponse, ctJSON;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, fetch("".concat(BASE_URL, "content_types/").concat(contentType, "?include_global_schema=true"), {
                    headers: {
                        "Content-Type": "application/json",
                        authtoken: authtoken,
                        api_key: sourceStack.key,
                    },
                })];
            case 1:
                ctResponse = _a.sent();
                return [4 /*yield*/, ctResponse.json()];
            case 2:
                ctJSON = _a.sent();
                return [2 /*return*/, ctJSON];
        }
    });
}); };
var main = function () { return __awaiter(_this, void 0, void 0, function () {
    var authtoken, ctSchema;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, login()];
            case 1:
                authtoken = _a.sent();
                return [4 /*yield*/, getContentTypeSchema(authtoken)];
            case 2:
                ctSchema = _a.sent();
                if (ctSchema === null || ctSchema === void 0 ? void 0 : ctSchema.error_code) {
                    console.error("Contentstack returned an error: ".concat(ctSchema.error_message));
                }
                return [2 /*return*/];
        }
    });
}); };
main();
