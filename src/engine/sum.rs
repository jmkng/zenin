#[inline(always)]
pub fn sum(buf: &[f64]) -> Option<f64> {
    if buf.is_empty() {
        None
    } else {
        Some(buf.iter().sum())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sum() {
        assert_eq!(sum(&[]), None);
        assert_eq!(sum(&[10.5, 20.0, 5.5]), Some(36.0));
    }
}
