export const parseToNumber = (val: string) => Number(val.replace('px', ''));

export const getStyle = ({ theme, ...ownerState }) => {
	let styles = {
		width: '100%',
		display: 'flex',
		flexFlow: 'column wrap',
		alignContent: 'space-between',
		boxSizing: 'border-box',
		'& > *': {
			boxSizing: 'border-box',
		},
	};

	const stylesSSR: any = {};

	if (ownerState.isSSR) {
		const orderStyleSSR = {};
		const { defaultSpacing } = ownerState;

		for (let i = 1; i <= ownerState.defaultColumns; i += 1) {
			orderStyleSSR[`&:nth-of-type(${ownerState.defaultColumns}n+${i % ownerState.defaultColumns})`] = {
				order: i,
			};
		}

		stylesSSR.height = ownerState.defaultHeight;
		stylesSSR.margin = -(defaultSpacing / 2);
		stylesSSR['& > *'] = {
			...styles['& > *'],
			...orderStyleSSR,
			margin: defaultSpacing / 2,
			width: `calc(${(100 / ownerState.defaultColumns).toFixed(2)}% - ${defaultSpacing}px)`,
		};

		return {
			...styles,
			...stylesSSR,
		};
	}

	const spacingValues = resolveBreakpointValues({
		values: ownerState.spacing,
		breakpoints: theme.breakpoints.values,
	});

	const transformer = createUnarySpacing(theme);
	const spacingStyleFromPropValue = (propValue) => {
		const themeSpacingValue = Number(propValue);
		const spacing = Number(getValue(transformer, themeSpacingValue).replace('px', ''));
		return {
			margin: -(spacing / 2),
			'& > *': {
				margin: spacing / 2,
			},
			...(ownerState.maxColumnHeight && {
				height: Math.ceil(ownerState.maxColumnHeight + spacing),
			}),
		};
	};

	styles = deepmerge(styles, handleBreakpoints({ theme }, spacingValues, spacingStyleFromPropValue));

	const columnValues = resolveBreakpointValues({
		values: ownerState.columns,
		breakpoints: theme.breakpoints.values,
	});

	const columnStyleFromPropValue = (propValue) => {
		const columnValue = Number(propValue);
		const width = `${(100 / columnValue).toFixed(2)}%`;
		const spacing = typeof spacingValues !== 'object' ? getValue(transformer, Number(spacingValues)) : '0px';
		return {
			'& > *': { width: `calc(${width} - ${spacing})` },
		};
	};

	styles = deepmerge(styles, handleBreakpoints({ theme }, columnValues, columnStyleFromPropValue));

	// configure width for responsive spacing values
	if (typeof spacingValues === 'object') {
		styles = deepmerge(
			styles,
			handleBreakpoints({ theme }, spacingValues, (propValue, breakpoint) => {
				if (breakpoint) {
					const themeSpacingValue = Number(propValue);
					const lastBreakpoint = Object.keys(columnValues).pop();
					const spacing = getValue(transformer, themeSpacingValue);
					const column =
						typeof columnValues === 'object' ? columnValues[breakpoint] || columnValues[lastBreakpoint] : columnValues;
					const width = `${(100 / column).toFixed(2)}%`;
					return {
						'& > *': { width: `calc(${width} - ${spacing})` },
					};
				}
				return null;
			})
		);
	}

	return styles;
};

export const useMasonry = (props: any) => {
	const styles = getStyle(props);

	return {
		styles,
	};
};
