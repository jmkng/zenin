use crate::engine::BinaryOp;

#[inline(always)]
pub fn binary_op(left: f64, right: f64, op: BinaryOp) -> f64 {
    match op {
        BinaryOp::Add => left + right,
        BinaryOp::Sub => left - right,
        BinaryOp::Mul => left * right,
        BinaryOp::Div => {
            if right == 0.0 {
                f64::NAN
            } else {
                left / right
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_binary_op() {
        assert_eq!(binary_op(10.0, 5.0, BinaryOp::Add), 15.0);
        assert_eq!(binary_op(10.0, 5.0, BinaryOp::Sub), 5.0);
        assert_eq!(binary_op(10.0, 5.0, BinaryOp::Mul), 50.0);
        assert_eq!(binary_op(10.0, 2.0, BinaryOp::Div), 5.0);
        assert!(binary_op(10.0, 0.0, BinaryOp::Div).is_nan());
    }
}
