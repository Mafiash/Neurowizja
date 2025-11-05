import {
  enqueueSnackbar as enqueueSnackbarSingle,
  closeSnackbar as closeSnackbarSingle,
} from "notistack";

export const handleSnackbarSessionExpired = () => {
  enqueueSnackbarSingle("Session expired", {
    anchorOrigin: { vertical: "top", horizontal: "right" },
    variant: "error",
    preventDuplicate: true,
    autoHideDuration: 5000,
    SnackbarProps: {
      onClick: () => closeSnackbarSingle(),
    },
  });
  localStorage.clear();
  window.location.replace("/login");
};

export const handleSnackbarError = (text: string) => {
  enqueueSnackbarSingle(text, {
    anchorOrigin: { vertical: "top", horizontal: "right" },
    style: { marginTop: "50px", marginBottom: "-50px" },
    variant: "error",
    preventDuplicate: true,
    autoHideDuration: 6000,
    SnackbarProps: {
      onClick: () => closeSnackbarSingle(),
    },
  });
};

export const handleSnackbarSuccess = (text: string) => {
  enqueueSnackbarSingle(text, {
    anchorOrigin: { vertical: "top", horizontal: "right" },
    style: { marginTop: "50px", marginBottom: "-50px" },
    variant: "success",
    preventDuplicate: false,
    autoHideDuration: 3000,
    SnackbarProps: {
      onClick: () => closeSnackbarSingle(),
    },
  });
};

export const handleSnackbarWarning = (text: string) => {
  enqueueSnackbarSingle(text, {
    anchorOrigin: { vertical: "top", horizontal: "right" },
    variant: "warning",
    preventDuplicate: true,
    autoHideDuration: 20000,
    SnackbarProps: {
      onClick: () => closeSnackbarSingle(),
    },
  });
};

export const Snackbars = () => {
  return {
    handleSnackbarSessionExpired,
    handleSnackbarSuccess,
    handleSnackbarError,
    handleSnackbarWarning,
  };
};
