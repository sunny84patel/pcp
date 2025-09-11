import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import API from "../../api";
import toast from "react-hot-toast";

// ✅ Update user
export const updateUser = createAsyncThunk(
  "user/updateUser",
  async (updates, { rejectWithValue }) => {
    try {
      const res = await API.put("/update", updates, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      toast.success("Profile updated successfully ✅");
      return res.data.user;
    } catch (err) {
      toast.error(err.response?.data?.msg || "Update failed ❌");
      return rejectWithValue(err.response?.data?.msg || "Update failed");
    }
  }
);

// ✅ Delete user
export const deleteUser = createAsyncThunk(
  "user/deleteUser",
  async (_, { rejectWithValue }) => {
    try {
      const res = await API.delete("/delete/:id", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      toast.success("Account deleted successfully 🗑️");
      return res.data;
    } catch (err) {
      toast.error(err.response?.data?.msg || "Delete failed ❌");
      return rejectWithValue(err.response?.data?.msg || "Delete failed");
    }
  }
);

const userSlice = createSlice({
  name: "user",
  initialState: {
    user: JSON.parse(sessionStorage.getItem("user")) || null,
    loading: false,
    error: null,
  },
  reducers: {
    logout: (state) => {
      state.user = null;
      sessionStorage.clear();
      localStorage.clear();
      toast.success("Logged out successfully 👋");
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(updateUser.pending, (state) => {
        state.loading = true;
        state.error = null;
        toast.loading("Updating profile...", { id: "updateUser" });
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        sessionStorage.setItem("user", JSON.stringify(action.payload));
        toast.dismiss("updateUser");
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        toast.dismiss("updateUser");
      })

      .addCase(deleteUser.pending, () => {
        toast.loading("Deleting account...", { id: "deleteUser" });
      })
      .addCase(deleteUser.fulfilled, (state) => {
        state.user = null;
        sessionStorage.clear();
        localStorage.clear();
        toast.dismiss("deleteUser");
      })
      .addCase(deleteUser.rejected, (state) => {
        toast.dismiss("deleteUser");
      });
  },
});

export const { logout } = userSlice.actions;
export default userSlice.reducer;
