import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

//generate access and refresh tokens - will be used in login
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById;
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating access and refresh tokens."
    );
  }
};

//REGISTER USER
const registerUser = asyncHandler(async (req, res) => {
  //get user details from frontend
  const { fullName, username, email, password } = req.body;
  // console.log("username : ", username);

  //validation - not empty
  if (
    [fullName, username, email, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required!");
  }

  //check if user already exists - username or email
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (existedUser) {
    throw new ApiError(409, "User already exists!");
  }

  //check for images, check for avatar
  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;
  let coverImageLocalPath;

  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  } else {
    console.error("Cover image is missing or improperly formatted.");
  }

  // console.log(req.files);

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar is required!");
  }

  //upload images to cloudinary, check avatar
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImg = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar is required!");
  }

  //create user object - create entry in db
  const user = await User.create({
    fullName,
    username: username.toLowerCase(),
    email,
    password,
    avatar: avatar.url,
    coverImage: coverImg?.url || "",
  });

  //remove password and refresh token from response
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  //check for user creation
  if (!createdUser) {
    throw new ApiError(500, "User creation failed!");
  }

  //return response
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User created successfully!"));
});

//LOGIN USER
const loginUser = asyncHandler(async (req, res) => {
  //take values from frontend-email,password
  const { email, username, passowrd } = req.body;

  //validate the values
  if (!username || !email) {
    throw new ApiError(400, "username or email is required!");
  }

  //find the user
  const user = await User.findOne({ $or: [{ username }, { email }] });
  if (!user) {
    throw new ApiError(404, "User does not exist!");
  }

  //password check
  const isPasswwordValid = await user.isPasswordCorrect(passowrd);

  if (!isPasswwordValid) {
    throw new ApiError(401, "Invalid password!");
  }

  //generate access token and refresh token
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  //send cookies
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "User logged in successfully!"
      )
    );
});

//LOGOUT USER
const logoutUser = asyncHandler(async (req, res) => {
  //find user and clear refresh token
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  //clear cookies
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", refreshToken)
    .json(new ApiResponse(200, {}, "User logged out successfully!"));
});



export { registerUser, loginUser, logoutUser };
