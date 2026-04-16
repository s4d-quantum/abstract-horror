export function getApiErrorMessage(error, fallback = 'Something went wrong') {
  return error?.response?.data?.error?.message
    || error?.response?.data?.message
    || error?.message
    || fallback;
}

export function getApiErrorCode(error) {
  return error?.response?.data?.error?.code || error?.response?.data?.code;
}
