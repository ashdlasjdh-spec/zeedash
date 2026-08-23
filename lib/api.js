import { NextResponse } from "next/server";

// Shared JSON error responses. The same NextResponse.json({ error }, { status }) shape was written
// ~200 times across the API routes; these collapse it to one call each. Success responses still use
// NextResponse.json directly.
export const err = (status, error) => NextResponse.json({ error }, { status });
export const unauthorized = (error = "Unauthorized") => err(401, error);
export const forbidden = (error = "Forbidden") => err(403, error);
export const badRequest = (error = "Bad request") => err(400, error);
export const notFound = (error = "Not found") => err(404, error);
export const serverError = (error) => err(500, error);
