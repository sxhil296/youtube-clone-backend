import { asyncHandler } from "../utils/asyncHandler.js";

//REGISTER USER
const registerUser = asyncHandler(async (req, res) => {
  res.status(200).json({
    message: "user created",
  });
});

export { registerUser };
