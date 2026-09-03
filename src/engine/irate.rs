use crate::engine::View;

#[inline(always)]
pub fn irate(w: &View) -> Option<f64> {
    let len = w.len();
    if len < 2 {
        return None;
    }

    // Last two points in window.
    let cp = w.get(len - 1)?;
    let pp = w.get(len - 2)?;

    if cp.t <= pp.t {
        return None;
    }

    let dt = cp.t - pp.t;

    let dv = if cp.v >= pp.v { cp.v - pp.v } else { cp.v };

    Some(dv / dt as f64)
}

#[cfg(test)]
mod tests {
    use crate::engine::{EWindow, Series};

    use super::*;

    #[test]
    #[rustfmt::skip]
    fn test_irate() {
        let mut series = Series::new(64);
        
        let t = [10,   20,   30,   40,   50,   60,   70,   80,    90,    100];
        let v = [10.0, 20.0, 35.0, 50.0, 60.0, 80.0, 95.0, 110.0, 120.0, 130.0];

        for (&t, &v) in t.iter().zip(v.iter()) {
            series.push(t, v);
        }

        let start_s: u64 = 20;
        let end_s: u64 = 100;
        let step_s = 20;
        let hist_s = 50;

        let mut win = EWindow::new(
            &series,
            start_s.saturating_sub(hist_s),
            end_s,
        );

        let mut results = Vec::new();

        let mut eval_t = start_s;

        while eval_t <= end_s {
            let view = win.slide(eval_t, hist_s);
            let rate = irate(&view);
            results.push((eval_t, rate));
            eval_t += step_s;
        }

        assert_eq!(results[0], (20, Some(1.0)));
        assert_eq!(results[1], (40, Some(1.5)));
    }
}
