function globalErrorHandler(err, req, res, next) {
  const status = err.status || 500;

  res.status(status).json({
    error: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
}


export default globalErrorHandler;