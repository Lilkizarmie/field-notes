import { showMessage } from "react-native-flash-message";
const showError = (message) => {
  showMessage({
    type: "danger",
    icon: "danger",
    message,
    style: {
      marginTop: 45,
      alignItems: "center",
    },
    titleStyle: {
      fontSize: 16,
    },
  });
};

const showSuccess = (message) => {
  showMessage({
    type: "success",
    icon: "success",
    message,
    style: {
      marginTop: 45,
      alignItems: "center",
    },
    titleStyle: {
      fontSize: 16,
    },
  });
};

export {
  showError,
  showSuccess,
};
