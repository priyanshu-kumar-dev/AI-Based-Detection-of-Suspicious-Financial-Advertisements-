const detectPaymentDetails = (text) => {

  const upis =
    text.match(
      /[\w.-]+@(paytm|ybl|ibl|okicici|axl)/g
    ) || [];

  const ifsc =
    text.match(
      /[A-Z]{4}0[A-Z0-9]{6}/g
    ) || [];

  return {
    upis,
    ifsc
  };
};

module.exports =
detectPaymentDetails;